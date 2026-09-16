/**
 * สร้างตาราง URL→ไฟล์ ใน `docs/modules/README.md` จาก `routes/router.tsx`
 *
 * เดิมตารางนั้นถูก **เขียนด้วยมือ** ผลคือมันค้างทั้งไฟล์: ตรวจครั้งล่าสุด 2026-09-16 พบว่า
 * ทุกแถวยังชี้ `routes/<section>/<leaf>/page.tsx` และ `[id]/page.tsx` ซึ่งเป็นคอนเวนชัน
 * ของ Next.js ที่ถูกลบไปตอน refactor เป็น colocated route (`<feature>.route.tsx`) — ไม่มี
 * สักพาธเดียวที่มีอยู่จริงบนดิสก์ แถมขาดโมดูลที่เพิ่มมาทีหลังทั้งหมด (`accounting`,
 * `register`, `legal`, `invitation`, `forgot-password`, `reset-password`)
 *
 * ที่ทำให้มันค้างเงียบคือไม่มีอะไรตรวจได้เลย — พาธผิดใน markdown ไม่ทำให้ `tsc` หรือเทสต์
 * แดง คนอ่านจึงไปเปิดไฟล์ที่ไม่มีอยู่แล้วสรุปเอาเองว่าเอกสารนี้เชื่อไม่ได้
 *
 * สคริปต์นี้ parse `router.tsx` ด้วย TypeScript AST (ไม่ใช่ regex — route ซ้อนกันหลายชั้น
 * และพาธของลูกต้องต่อจากพาธพ่อ) แล้วเขียนทับเฉพาะตาราง **คำอธิบายใต้หัวข้อแต่ละโมดูล
 * เป็นงานเขียนมือและถูกอ่านกลับมาใส่ให้เหมือนเดิม** โมดูลใหม่ที่ยังไม่มีคำอธิบายจะได้
 * placeholder ไว้ให้เติม
 *
 * ## วิธีใช้
 *     bun run gen:route-map            # เขียนทับ docs/modules/README.md
 *     bun run gen:route-map --check    # ไม่เขียน — exit 1 ถ้าเอกสารไม่ตรงกับ router
 *
 * `--check` มีไว้เสียบ CI ได้ถ้าวันหนึ่งอยากกันไม่ให้ค้างอีก (ตอนนี้ยังไม่ได้เสียบ)
 */
import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUTER = resolve(HERE, "../routes/router.tsx");
const DOC = resolve(HERE, "../docs/modules/README.md");

const PLACEHOLDER = "_ยังไม่มีคำอธิบาย — เติมได้เลย บรรทัดนี้จะไม่ถูกเขียนทับ_";

interface Row {
  url: string;
  file: string;
}

// ── parse router.tsx ────────────────────────────────────────────────────────

function collectRoutes(): Row[] {
  const source = ts.createSourceFile(
    ROUTER,
    readFileSync(ROUTER, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const rows: Row[] = [];

  const propOf = (
    obj: ts.ObjectLiteralExpression,
    name: string,
  ): ts.Expression | undefined => {
    for (const member of obj.properties) {
      if (
        ts.isPropertyAssignment(member) &&
        ts.isIdentifier(member.name) &&
        member.name.text === name
      ) {
        return member.initializer;
      }
    }
    return undefined;
  };

  // `lazy: () => import("./config/unit/unit.route")` → "routes/config/unit/unit.route"
  const lazyTargetOf = (obj: ts.ObjectLiteralExpression): string | null => {
    const lazy = propOf(obj, "lazy");
    if (!lazy) return null;
    const match = /import\(\s*["']([^"']+)["']\s*\)/.exec(lazy.getText());
    return match ? match[1].replace(/^\.\//, "routes/") : null;
  };

  const joinPath = (
    parent: string,
    own: string | null,
    isIndex: boolean,
  ): string => {
    if (isIndex) return parent || "/";
    if (own === null) return parent;
    if (own.startsWith("/")) return own;
    return (parent === "/" ? "" : parent) + "/" + own;
  };

  const walk = (node: ts.Node, parent: string): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const pathProp = propOf(node, "path");
      const own =
        pathProp && ts.isStringLiteral(pathProp) ? pathProp.text : null;
      const here = joinPath(parent, own, propOf(node, "index") !== undefined);

      const lazyTarget = lazyTargetOf(node);
      if (lazyTarget) rows.push({ url: here, file: `${lazyTarget}.tsx` });

      const children = propOf(node, "children");
      if (children && ts.isArrayLiteralExpression(children)) {
        for (const child of children.elements) walk(child, here);
      }
      return;
    }
    ts.forEachChild(node, (child) => walk(child, parent));
  };

  walk(source, "");
  return rows;
}

function groupByModule(rows: Row[]): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const module = row.file.split("/")[1];
    const bucket = groups.get(module);
    if (bucket) bucket.push(row);
    else groups.set(module, [row]);
  }
  for (const bucket of groups.values()) {
    bucket.sort(
      (a, b) => a.file.localeCompare(b.file) || a.url.localeCompare(b.url),
    );
  }
  return groups;
}

// ── read back the hand-written parts of the doc ─────────────────────────────

interface DocShape {
  header: string;
  prose: Map<string, string>;
  order: string[];
}

function readDoc(): DocShape {
  const text = readFileSync(DOC, "utf8");
  const firstHeading = text.indexOf("\n## ");
  const header = (
    firstHeading === -1 ? text : text.slice(0, firstHeading)
  ).trimEnd();

  const prose = new Map<string, string>();
  const order: string[] = [];
  // หัวข้อโมดูล → ทุกอย่างจนถึงตารางแรก (หรือหัวข้อถัดไป) คือคำอธิบายที่เขียนมือ
  // `$(?![\s\S])` = ท้ายอินพุตจริง ๆ — `$` เฉย ๆ ใช้ไม่ได้เพราะแฟล็ก m ทำให้มันหมายถึง
  // ท้ายบรรทัด และ `\Z` ของภาษาอื่นใน JS แปลว่าตัวอักษร Z
  for (const match of text.matchAll(
    /^## (.+)$\n([\s\S]*?)(?=^\| URL \||^## |$(?![\s\S]))/gm,
  )) {
    const module = match[1].trim();
    order.push(module);
    prose.set(module, match[2].trim());
  }
  return { header, prose, order };
}

// ── render ──────────────────────────────────────────────────────────────────

function render(groups: Map<string, Row[]>, doc: DocShape): string {
  // เรียงตามลำดับเดิมในเอกสาร (จัดมาด้วยมือ: โมดูลธุรกิจก่อน หน้า public ท้ายสุด)
  // โมดูลใหม่ที่ยังไม่อยู่ในเอกสารต่อท้าย
  const known = doc.order.filter((module) => groups.has(module));
  const added = [...groups.keys()]
    .filter((module) => !known.includes(module))
    .sort();
  const modules = [...known, ...added];

  const total = [...groups.values()].reduce((sum, rows) => sum + rows.length, 0);
  const header = doc.header.replace(
    /\(\d+ lazy routes\)/,
    `(${total} lazy routes)`,
  );

  const parts = [header, ""];
  for (const module of modules) {
    const rows = groups.get(module)!;
    parts.push(`## ${module}`, "");
    parts.push(doc.prose.get(module) || PLACEHOLDER, "");
    parts.push("| URL | File |", "|---|---|");
    for (const row of rows) parts.push(`| \`${row.url}\` | \`${row.file}\` |`);
    parts.push("");
  }
  parts.push("<!-- /AUTO-GENERATED -->", "");
  return parts.join("\n");
}

// ── main ────────────────────────────────────────────────────────────────────

const rows = collectRoutes();
if (rows.length === 0) {
  console.error("ไม่พบ lazy route สักเส้นใน routes/router.tsx — ไม่เขียนทับเอกสาร");
  process.exit(1);
}

const groups = groupByModule(rows);
const doc = readDoc();
const next = render(groups, doc);

// พาธที่ผลิตได้ต้องมีอยู่จริง ไม่งั้นเอกสารก็แค่ผิดคนละแบบ
const missing = [...new Set(rows.map((row) => row.file))].filter(
  (file) => !ts.sys.fileExists(resolve(HERE, "..", file)),
);
if (missing.length > 0) {
  console.error(
    `ไฟล์ปลายทางที่ router ชี้ไปไม่มีอยู่จริง:\n  ${missing.join("\n  ")}`,
  );
  process.exit(1);
}

if (process.argv.includes("--check")) {
  if (readFileSync(DOC, "utf8") === next) {
    console.log(`docs/modules/README.md ตรงกับ router แล้ว (${rows.length} routes)`);
    process.exit(0);
  }
  console.error(
    "docs/modules/README.md ไม่ตรงกับ routes/router.tsx — รัน `bun run gen:route-map` แล้ว commit",
  );
  process.exit(1);
}

writeFileSync(DOC, next);
console.log(
  `เขียน docs/modules/README.md แล้ว — ${rows.length} routes / ${groups.size} โมดูล`,
);
const undescribed = [...groups.keys()].filter(
  (module) => !doc.prose.get(module) || doc.prose.get(module) === PLACEHOLDER,
);
if (undescribed.length > 0) {
  console.log(`โมดูลที่ยังไม่มีคำอธิบาย: ${undescribed.join(", ")}`);
}
