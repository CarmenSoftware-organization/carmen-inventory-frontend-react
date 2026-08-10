/**
 * ฝังภาพหน้าจอเป็น data URI และแปลงผัง mermaid เป็น SVG ลง template ของ deck
 *
 * CSP ของ Artifact บล็อกทุกคำขอไปโฮสต์ภายนอก ภาพจึงต้องฝังมาในหน้า และ base64
 * ของสิบกว่าภาพพิมพ์ด้วยมือไม่ได้ template จึงใช้โทเคน {{IMG_01}}.. แล้วให้
 * สคริปต์นี้แทนที่ พร้อมเช็กงบขนาดไฟล์ให้ตั้งแต่ตอน build ไม่ต้องรอให้เผยแพร่ล้มเหลว
 *
 * ผัง mermaid อยู่บนเหตุผลเดียวกัน — `<pre class="mermaid">` กลายเป็นผังได้เฉพาะที่ที่มี
 * mermaid runtime ซึ่งมีแต่บน Artifact เท่านั้น เปิดไฟล์ในเครื่องหรือสั่งพิมพ์จะเห็นเป็น
 * ข้อความดิบ สคริปต์จึง render เป็น SVG นิ่งตั้งแต่ตอน build ผังจึงขึ้นเหมือนกันทุกที่
 * ทั้งเปิดในเครื่อง บน Artifact และในไฟล์ PDF ที่พิมพ์ออกมา
 *
 * รัน: bun scripts/investor/build-deck.mjs [ชื่อ template]
 *   ไม่ใส่อาร์กิวเมนต์ = สร้างทุก template ที่มีอยู่ (อังกฤษและไทย)
 *
 * mermaid-cli ไม่ได้อยู่ใน package.json โดยตั้งใจ — มันลาก puppeteer + Chromium (~300MB)
 * มาด้วย ซึ่ง ci.yml, deploy-gcp.yml และ Dockerfile ที่รัน `bun install` ทุกครั้งไม่ควรแบก
 * ไว้เพื่อผังที่ rebuild ปีละไม่กี่หน bunx ดึงมาแคชครั้งแรกครั้งเดียว ครั้งถัดไปทำงานออฟไลน์ได้
 *
 * ภาพชุดเดียวกันถูกใช้ร่วมกันทุกภาษา — เปลี่ยนภาพครั้งเดียวแล้ว build ใหม่ ได้ครบทุกฉบับ
 */
import { readFileSync, writeFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const ASSETS = "docs/investor/assets";
const DECK_DIR = "docs/investor/deck";
const LIMIT_MB = 12;

/** ตรึงเวอร์ชันไว้ ผังจะได้ไม่ขยับเองเงียบ ๆ เมื่อ mermaid ออกรุ่นใหม่ */
const MERMAID_CLI = "@mermaid-js/mermaid-cli@11.16.0";

/**
 * สีและฟอนต์ล้อ :root ของ template โดยตรง — mermaid ใส่สีตายตัวลงใน <style> ของ SVG
 * จึงต้องบอกค่าตั้งแต่ตอน render ไม่ใช่ไปคุมด้วย CSS ทีหลัง
 * ค่าที่ใช้: --card #ffffff · --ink #151a21 · --rule #d3dae1 (เข้มขึ้นเป็น #b9c3cd
 * เพราะเส้นขอบบาง ๆ บนกระดาษจางกว่าบนจอ) · --muted #59636f · --accent-soft #e8eef7
 */
const MERMAID_CONFIG = {
  theme: "base",
  themeVariables: {
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontSize: "15px",
    primaryColor: "#ffffff",
    primaryTextColor: "#151a21",
    primaryBorderColor: "#b9c3cd",
    lineColor: "#59636f",
    secondaryColor: "#e8eef7",
    tertiaryColor: "#f2f5f7",
    textColor: "#151a21",
    mainBkg: "#ffffff",
    nodeBorder: "#b9c3cd",
    clusterBkg: "#f2f5f7",
    edgeLabelBackground: "#f2f5f7",
  },
  flowchart: { curve: "basis", padding: 10, nodeSpacing: 38, rankSpacing: 42, useMaxWidth: true },
};

/**
 * template เป็น HTML ตัวผังจึงเขียนด้วย entity (&middot; &amp;) แต่ mermaid อ่าน
 * ข้อความดิบ ต้องคลายก่อนส่งเข้า renderer ไม่งั้นได้กล่องที่เขียนว่า "&middot;" ตรง ๆ
 * &amp; ต้องอยู่ท้ายสุดเสมอ มิฉะนั้น &amp;lt; จะถูกคลายสองชั้นกลายเป็น < ที่ไม่ได้ตั้งใจ
 */
const ENTITIES = [
  [/&middot;/g, "·"],
  [/&mdash;/g, "—"],
  [/&ndash;/g, "–"],
  [/&nbsp;/g, " "],
  [/&quot;/g, '"'],
  [/&amp;/g, "&"],
];

const decodeEntities = (text) =>
  ENTITIES.reduce((acc, [pattern, char]) => acc.replace(pattern, char), text);

/**
 * แทนที่ทุกบล็อก <pre class="mermaid"> ด้วย SVG ที่ render แล้ว
 * คืน { html, rendered } — โยน error ถ้า render ไม่สำเร็จ ให้ build ล้มทั้งใบ
 * เหมือนกรณีโทเคนภาพหาย: deck ที่ผังหายไปเงียบ ๆ อันตรายกว่า build ที่ล้มดัง ๆ
 */
function renderMermaidBlocks(html) {
  const blocks = [...html.matchAll(/<pre class="mermaid">([\s\S]*?)<\/pre>/g)];
  if (blocks.length === 0) return { html, rendered: 0 };

  const workDir = mkdtempSync(join(tmpdir(), "carmen-deck-"));
  try {
    const configPath = join(workDir, "mermaid-config.json");
    writeFileSync(configPath, JSON.stringify(MERMAID_CONFIG));

    let result = html;
    blocks.forEach((block, index) => {
      const source = decodeEntities(block[1]).trim();
      const mmdPath = join(workDir, `diagram-${index}.mmd`);
      const svgPath = join(workDir, `diagram-${index}.svg`);
      writeFileSync(mmdPath, `${source}\n`);

      execFileSync(
        "bunx",
        [
          "--bun", MERMAID_CLI,
          "-i", mmdPath,
          "-o", svgPath,
          "-c", configPath,
          "-b", "transparent",
          // id ของ SVG คือ scope ของ <style> ที่ mermaid ฝังมา สองผัง id เดียวกันในหน้าเดียว
          // จะแย่งกันจัดสไตล์ จึงต้องแยกต่อผัง แม้ตอนนี้ deck จะมีผังเดียวก็ตาม
          "-I", `deck-diagram-${index}`,
          "-q",
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );

      const svg = readFileSync(svgPath, "utf8").trim();
      // ใช้ฟังก์ชันแทนสตริง เพราะ $& $1 ใน SVG จะถูก replace ตีความเป็น backreference
      result = result.replace(block[0], () => svg);
    });

    return { html: result, rendered: blocks.length };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

const images = readdirSync(ASSETS)
  .filter((f) => f.endsWith(".jpg"))
  .sort()
  .map((file) => ({
    token: `{{IMG_${file.slice(0, 2)}}}`,
    uri: `data:image/jpeg;base64,${readFileSync(join(ASSETS, file)).toString("base64")}`,
    file,
  }));

const arg = process.argv[2];
const templates = arg
  ? [arg]
  : readdirSync(DECK_DIR).filter((f) => f.endsWith(".template.html"));

if (templates.length === 0) {
  console.error(`ไม่พบ template ใน ${DECK_DIR}`);
  process.exit(1);
}

let failed = false;

for (const name of templates.sort()) {
  const templatePath = join(DECK_DIR, name);
  const outputPath = join(DECK_DIR, name.replace(".template.html", ".html"));

  let html = readFileSync(templatePath, "utf8");
  let embedded = 0;

  for (const img of images) {
    if (!html.includes(img.token)) continue;
    html = html.split(img.token).join(img.uri);
    embedded++;
  }

  const leftover = html.match(/\{\{IMG_\d{2}\}\}/g);
  if (leftover) {
    console.error(
      `${name} — โทเคนที่ไม่มีไฟล์ภาพรองรับ: ${[...new Set(leftover)].join(", ")}`,
    );
    failed = true;
    continue;
  }

  let diagrams = 0;
  try {
    const result = renderMermaidBlocks(html);
    html = result.html;
    diagrams = result.rendered;
  } catch (error) {
    console.error(
      `${name} — แปลงผัง mermaid ไม่สำเร็จ: ${error.stderr?.toString().trim() || error.message}\n` +
        `  ครั้งแรกต้องต่อเน็ตให้ bunx ดึง ${MERMAID_CLI} มาแคชก่อน`,
    );
    failed = true;
    continue;
  }

  writeFileSync(outputPath, html);

  const mb = Buffer.byteLength(html) / 1024 / 1024;
  console.log(
    `เขียน ${outputPath} — ฝัง ${embedded} ภาพ — ${diagrams} ผัง — ${mb.toFixed(2)} MB`,
  );

  if (mb > LIMIT_MB) {
    console.error(
      `${name} — เกิน ${LIMIT_MB}MB ลดคุณภาพ JPEG เป็น 75 หรือย่อความกว้างลง แล้ว build ใหม่`,
    );
    failed = true;
  }
}

if (failed) process.exit(1);
