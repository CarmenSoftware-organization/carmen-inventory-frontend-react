# build:{env} + changelog generator — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม `bun run build:{local,dev,uat,prod}` และทำให้ `bun run build:bump` generate `changelog.json` + `CHANGELOG.md` จาก git history เอง

**Architecture:** สคริปต์ `build:*` เป็น wrapper บาง ๆ ที่เซ็ต `BUILD_CONFIG_FILE` แล้วเรียก `build` เดิม (ไม่แตะ `vite.config.ts` และไม่แตะ deploy path ใด ๆ) · ฝั่ง changelog แยกเป็น library ที่ไม่มี side effect (`scripts/changelog.ts`) + CLI บาง ๆ (`scripts/changelog-cli.ts`) แล้วให้ `scripts/bump.ts` เรียก library นั้นระหว่างขั้นตอนตัด release โดยเลิกใช้ `bun pm version` ไปเขียน git เอง

**Tech Stack:** Bun · TypeScript (tsconfig ชุดเดียว `include: ["**/*.ts"]` ครอบ `scripts/` อยู่แล้ว) · git plumbing ผ่าน `node:child_process`

**Spec:** `docs/superpowers/specs/2026-08-10-build-env-scripts-and-changelog-design.md`

## Global Constraints

- **ไม่เขียนเทสต์อัตโนมัติใหม่** ตาม preference ของผู้ใช้ — ข้ามทุกขั้นที่เป็น "write the failing test" / "run test to verify it fails" · **ห้ามสร้างไฟล์ `*.test.ts` / `*.spec.ts`**
- **static check ไม่ใช่เทสต์ — ยังต้องรัน**: `bun run typecheck` และ `bun run lint` ต้องเขียวทุก task ก่อน commit
- **เทสต์ชุดเดิมต้องไม่แดง**: `bun test:run` ต้องผ่านก่อนจบงาน
- **commit message เป็นภาษาไทย** (ยกเว้น identifier / path) ตาม `CLAUDE.md`
- **ห้ามแก้ `"build"` ใน package.json** — `deploy-s3.sh:10`, `deploy-gcs.sh:12`, `Dockerfile:19`, `ci.yml:38`, `deploy-gcp.yml:48` เรียกมันตรง ๆ และ CI ส่ง `BUILD_CONFIG_FILE=config.sample.json` เข้ามาทับ default ซึ่งต้องยังทำงานได้
- **ห้ามเขียน `"build": "bun run build:prod"`** — inline env var จะทับค่าที่ CI ส่งมาแล้ว CI พังเพราะ `config.prod.json` ถูก gitignore
- **ห้าม `git push`** — ทุก task จบที่ commit ในเครื่อง
- ทำงานบน branch `feature/build-env-scripts-changelog` (มีอยู่แล้ว มี commit สเปกอยู่ 1 ตัว)

---

### Task 1: สคริปต์ build ต่อ environment

**Files:**
- Modify: `package.json:12` (บล็อก `scripts`)
- Modify: `CLAUDE.md` (หัวข้อ Commands)
- Modify: `docs/deploy.md:3-5`

**Interfaces:**
- Consumes: `emitBuildConfig()` ใน `vite.config.ts:48-61` ซึ่งอ่าน `process.env.BUILD_CONFIG_FILE` อยู่แล้ว — **ไม่ต้องแก้ไฟล์นั้น**
- Produces: คำสั่ง `bun run build:{local,dev,uat,prod}` (task อื่นไม่ได้ใช้ต่อ)

- [ ] **Step 1: เพิ่ม 4 สคริปต์ใน package.json**

แทนที่บรรทัด `"build": "tsc --noEmit && vite build",` ด้วย:

```json
    "build": "tsc --noEmit && vite build",
    "build:local": "BUILD_CONFIG_FILE=config.local.json bun run build",
    "build:dev": "BUILD_CONFIG_FILE=config.dev.json bun run build",
    "build:uat": "BUILD_CONFIG_FILE=config.uat.json bun run build",
    "build:prod": "BUILD_CONFIG_FILE=config.prod.json bun run build",
```

บรรทัด `"build:bump": "bun scripts/bump.ts",` ที่อยู่ถัดไปคงเดิม

- [ ] **Step 2: ตรวจว่าไฟล์ config ที่อ้างถึงมีครบในเครื่อง**

```bash
ls public/config.{local,dev,uat,prod}.json
```
คาดหวัง: ครบ 4 ไฟล์ (ถูก gitignore แต่มีอยู่ในเครื่อง) — ถ้าขาดตัวไหน copy จาก `public/config.sample.json` แล้วเติมค่าก่อนไปต่อ

- [ ] **Step 3: ตรวจว่าแต่ละ env ได้ config ถูกตัว**

```bash
bun run build:uat && diff <(cat dist/config.json) public/config.uat.json && echo "uat OK"
bun run build && diff <(cat dist/config.json) public/config.prod.json && echo "default ยังเป็น prod OK"
BUILD_CONFIG_FILE=config.sample.json bun run build && diff <(cat dist/config.json) public/config.sample.json && echo "CI override ยังชนะ OK"
```
คาดหวัง: ขึ้น `OK` ครบทั้ง 3 บรรทัด · ข้อที่ 3 คือด่านสำคัญ — พิสูจน์ว่า CI ไม่พัง

- [ ] **Step 4: อัปเดต CLAUDE.md หัวข้อ Commands**

แทนที่บรรทัด:
```
bun run build        # tsc + vite build → dist/
```
ด้วย:
```
bun run build        # tsc + vite build → dist/ (config.json = config.prod.json)
bun run build:{local,dev,uat,prod}   # เหมือน build แต่เลือก public/config.<env>.json → dist/config.json — มีผลกับ `bun run preview` / Vercel เท่านั้น (S3/GCS/Docker ใช้ config.json ของ environment เอง)
```

- [ ] **Step 5: อัปเดต docs/deploy.md**

แทรกย่อหน้าใหม่ต่อจากย่อหน้าเปิด (หลังบรรทัด ``` `config.json` lives on the bucket (never in the bundle); `index.html` is no-cache.```):

```markdown

`bun run build:{local,dev,uat,prod}` เลือกได้ว่า `dist/config.json` จะมาจากไฟล์ไหน แต่
**ไม่กระทบการ deploy ทั้งสองทาง** — `deploy-s3.sh` / `deploy-gcs.sh` ตัด `dist/config.json`
ออกจาก sync และ Docker image ลบทิ้งแล้ว render ใหม่จาก env ตอนรัน สคริปต์ชุดนี้มีไว้สำหรับ
`bun run preview` และ Vercel ซึ่งเสิร์ฟไฟล์ในบันเดิลตรง ๆ
```

- [ ] **Step 6: static check**

```bash
bun run typecheck && bun run lint
```
คาดหวัง: ผ่านทั้งคู่ (ไม่มีไฟล์ `.ts` เปลี่ยนใน task นี้ แต่รันเป็นด่านมาตรฐาน)

- [ ] **Step 7: Commit**

```bash
git add package.json CLAUDE.md docs/deploy.md
git commit -m "$(cat <<'EOF'
feat(build): สคริปต์ build ต่อ environment

เพิ่ม build:{local,dev,uat,prod} ที่เซ็ต BUILD_CONFIG_FILE แล้วเรียก build เดิม
ล้อรูปแบบเดียวกับ dev:* ที่มีอยู่

`build` เปล่าไม่แตะ — ยัง default เป็น config.prod.json ตาม vite.config.ts
deploy script, Dockerfile และ CI จึงไม่ต้องแก้ และ BUILD_CONFIG_FILE ที่ CI
ส่งเข้ามายังทับ default ได้เหมือนเดิม
EOF
)"
```

---

### Task 2: changelog generator

**Files:**
- Create: `scripts/changelog.ts` (library — ไม่มี side effect ตอน import)
- Create: `scripts/changelog-cli.ts` (จุดเข้าใช้จาก command line)
- Read-only: `lib/changelog.ts:4-31` (แหล่ง type)

**Interfaces:**
- Consumes: `import type { ChangeItem, Changelog, VersionEntry } from "../lib/changelog"` — type-only จึงถูก erase ทิ้ง ไม่ลาก `changelog.json` เข้าสคริปต์
- Produces:
  - `recordRelease(params: { target: string; fullVersion: string }): void` — Task 4 เรียก
  - `rebuildFromTags(): void` — Task 3 เรียกผ่าน CLI
  - `renderMarkdown(changelog: Changelog): string`

> **ทำไมต้องมี `changelog-cli.ts` แยก:** ตัวตรวจ "ถูกเรียกตรง ๆ หรือถูก import" ของ bun คือ
> `import.meta.main` ซึ่ง `@types/node` ไม่รู้จัก และ repo ไม่ได้ติดตั้ง `@types/bun`
> → `bun run typecheck` จะแดงทันที การแยกไฟล์ทำให้ library ไม่มี side effect เลย
> `bump.ts` import ได้อย่างปลอดภัย โดยไม่ต้องเพิ่ม dependency ใหม่

- [ ] **Step 1: สร้าง `scripts/changelog.ts`**

```ts
/**
 * สร้าง changelog ของแอปจาก git history
 *
 * ยกมาจาก carmen-turborepo-backend-v2
 * (`apps/backend-gateway/scripts/generate-changelog.ts`) แล้วดัดแปลงให้เข้ากับ
 * รีโปนี้ — ดู `collectCommits()` สำหรับจุดที่ต่างกันจริง ๆ และสำคัญที่สุด
 *
 * ไฟล์นี้เป็น library ล้วน ไม่ทำอะไรตอน import — จุดเข้าใช้จาก command line
 * อยู่ที่ `scripts/changelog-cli.ts`
 *
 * type มาจาก `lib/changelog.ts` ที่เดียว (`import type` จึงถูก erase ทิ้ง ไม่ลาก
 * `changelog.json` เข้ามาในสคริปต์) — สำเนา interface สองชุดที่ต้อง sync กันเอง
 * คือปัญหาที่ `scripts/app-version.ts` ถูกแยกออกมาแก้อยู่แล้ว
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ChangeItem, Changelog, VersionEntry } from "../lib/changelog";

/** ตัวคั่นฟิลด์ใน --pretty — ASCII unit separator ไม่มีทางโผล่ในข้อความ commit */
const UNIT = "\x1f";

const ROOT = path.resolve(import.meta.dirname, "..");
const JSON_PATH = path.resolve(ROOT, "changelog.json");
const MD_PATH = path.resolve(ROOT, "CHANGELOG.md");

type Category = "added" | "fixed" | "changed";

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8", cwd: ROOT }).trim();
}

/** commit type → หมวดใน changelog · type อื่น (docs/chore/test/style/build) ถูกทิ้ง */
function categoryFor(type: string): Category | null {
  if (type === "feat") return "added";
  if (type === "fix") return "fixed";
  if (type === "perf" || type === "refactor") return "changed";
  return null;
}

interface RawCommit {
  hash: string;
  author: string;
  subject: string;
  pr: number | null;
}

function parsePrFromSubject(subject: string): number | null {
  const match = /\(#(\d+)\)/.exec(subject);
  return match ? Number(match[1]) : null;
}

function parseLines(raw: string): RawCommit[] {
  if (!raw) return [];
  return raw.split("\n").map((line) => {
    const [hash, author, subject] = line.split(UNIT);
    return { hash, author, subject, pr: parsePrFromSubject(subject) };
  });
}

/**
 * เก็บ commit ทั้งหมดในช่วงที่ระบุ (รับได้ทั้ง "a..b" และ "<ref>" = ทั้งประวัติถึง ref)
 *
 * **จุดที่ต่างจากต้นฉบับฝั่ง backend และห้ามลอกกลับ:** ที่นั่นเขียน
 * `if (merge.pr === null) continue;` เพราะทุก merge มาจาก GitHub PR แต่รีโปนี้
 * merge branch ในเครื่องด้วยข้อความ `merge: <ไทย>` อยู่ 33 จาก 108 merge
 * (ยืนยัน 2026-08-10) การข้ามไปจะทิ้ง commit ทั้งสาขาแบบเงียบ ๆ → เดินทุก merge
 * แล้วปล่อยให้ `pr` เป็น null เมื่อหาเลขไม่เจอ
 */
function collectCommits(range: string): RawCommit[] {
  const seen = new Set<string>();
  const commits: RawCommit[] = [];

  // 1) merge บนเส้น first-parent — หนึ่งตัวต่อหนึ่งสาขาที่ถูก merge เข้ามา
  const mergeRaw = git("log", "--first-parent", "--merges", `--pretty=format:%h${UNIT}%s`, range);
  const merges = mergeRaw
    ? mergeRaw.split("\n").map((line) => {
        const [hash, subject] = line.split(UNIT);
        const prMatch = /Merge pull request #(\d+)/.exec(subject);
        return { hash, pr: prMatch ? Number(prMatch[1]) : null };
      })
    : [];
  for (const merge of merges) {
    const introduced = parseLines(
      git(
        "log",
        "--no-merges",
        `--pretty=format:%h${UNIT}%an${UNIT}%s`,
        `${merge.hash}^1..${merge.hash}^2`,
      ),
    );
    for (const commit of introduced) {
      if (seen.has(commit.hash)) continue;
      seen.add(commit.hash);
      commits.push({ ...commit, pr: commit.pr ?? merge.pr });
    }
  }

  // 2) commit ที่ลงเส้น first-parent ตรง ๆ ไม่ผ่าน merge
  const directs = parseLines(
    git("log", "--first-parent", "--no-merges", `--pretty=format:%h${UNIT}%an${UNIT}%s`, range),
  );
  for (const commit of directs) {
    if (seen.has(commit.hash)) continue;
    seen.add(commit.hash);
    commits.push(commit);
  }
  return commits;
}

function toChangeItem(commit: RawCommit): { category: Category; item: ChangeItem } | null {
  const conventional = /^(\w+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/.exec(commit.subject);
  if (!conventional) return null;
  const category = categoryFor(conventional[1]);
  if (!category) return null;
  return {
    category,
    item: {
      scope: conventional[2] ?? null,
      // ตัด "(#123)" ท้ายหัวข้อทิ้ง — เลข PR ถูกเก็บเป็นฟิลด์ของตัวเองแล้ว
      summary: conventional[4].replace(/\s*\(#\d+\)\s*$/, "").trim(),
      hash: commit.hash,
      author: commit.author,
      pr: commit.pr,
    },
  };
}

function buildChanges(range: string): VersionEntry["changes"] {
  const changes: VersionEntry["changes"] = { added: [], fixed: [], changed: [] };
  for (const commit of collectCommits(range)) {
    const parsed = toChangeItem(commit);
    if (!parsed) continue;
    changes[parsed.category].push(parsed.item);
  }
  return changes;
}

function renderItem(item: ChangeItem): string {
  const scope = item.scope ? `**${item.scope}:** ` : "";
  const pr = item.pr ? ` (#${item.pr})` : "";
  return `- ${scope}${item.summary}${pr} — ${item.author} \`${item.hash}\``;
}

export function renderMarkdown(changelog: Changelog): string {
  const lines: string[] = [
    "# Changelog",
    "",
    "ไฟล์นี้ generate จาก git history โดย `bun run build:bump` — อย่าแก้ด้วยมือ",
    "แก้ที่ `changelog.json` หรือแก้ตัว generator (`scripts/changelog.ts`) แล้วรัน",
    "`bun scripts/changelog-cli.ts` เพื่อ render ใหม่",
    "",
  ];
  for (const entry of changelog.versions) {
    lines.push(`## [${entry.version}] - ${entry.date}`, "");
    const sections: Array<[string, ChangeItem[]]> = [
      ["Added", entry.changes.added],
      ["Fixed", entry.changes.fixed],
      ["Changed", entry.changes.changed],
    ];
    if (!sections.some(([, items]) => items.length > 0)) {
      // ใช้ "init" ให้ตรงกับที่ whats-new-dialog.tsx:50 เช็ค — ต้นฉบับ backend
      // ใช้คำว่า "baseline" ซึ่งฝั่งนี้ไม่มีใครอ่าน
      lines.push(entry.note === "init" ? "_Initial release._" : "_No notable changes._", "");
      continue;
    }
    for (const [title, items] of sections) {
      if (items.length === 0) continue;
      lines.push(`### ${title}`, ...items.map(renderItem), "");
    }
  }
  return lines.join("\n").replace(/\n+$/, "") + "\n";
}

export function readChangelog(): Changelog {
  return JSON.parse(readFileSync(JSON_PATH, "utf8")) as Changelog;
}

function writeAll(changelog: Changelog): void {
  writeFileSync(JSON_PATH, JSON.stringify(changelog, null, 2) + "\n");
  writeFileSync(MD_PATH, renderMarkdown(changelog));
}

function countChanges(entry: VersionEntry): number {
  return entry.changes.added.length + entry.changes.fixed.length + entry.changes.changed.length;
}

function isCommit(rev: string): boolean {
  try {
    return git("cat-file", "-t", rev) === "commit";
  } catch {
    return false;
  }
}

/**
 * แทรก entry ของ release ใหม่ไว้บนสุด แล้วเขียนทั้ง changelog.json และ CHANGELOG.md
 *
 * ช่วง git = `<commit ของ entry บนสุด>..HEAD` ซึ่งกิน commit `chore(release):`
 * ของรอบก่อนเข้ามาด้วย 1 ตัว — ตั้งใจ เพราะ `chore` ไม่เข้าเกณฑ์หมวดใดเลยและถูก
 * `toChangeItem()` ทิ้งอยู่แล้ว (entry ที่ได้จาก rebuildFromTags() ไม่มีอาการนี้
 * เพราะ commit ของมันชี้ที่ release commit พอดี — ความต่างนี้ตั้งใจ ไม่ต้องทำให้เท่ากัน)
 *
 * @param params.target semver ที่กำลังปล่อย เช่น "1.2.1"
 * @param params.fullVersion เช่น "1.2.1-build.20260810.abc1234" — ส่วนท้ายสุดคือ
 *   short hash ของ HEAD ก่อน release commit และถูกใช้เป็นฟิลด์ `commit` ของ entry
 * @throws ถ้า changelog.json ไม่มี entry หรือ baseline ชี้ commit ที่ไม่มีในรีโป
 */
export function recordRelease(params: { target: string; fullVersion: string }): void {
  const changelog = readChangelog();
  const baseline = changelog.versions[0]?.commit;
  if (!baseline) throw new Error("changelog.json ไม่มี entry ให้ใช้เป็น baseline");
  // เคยเกิดจริง: changelog.json ที่ port ติดมาจาก Next.js app ชี้ commit dbf5ae2b
  // ที่ไม่มีในรีโปนี้ แล้ว `git log dbf5ae2b..HEAD` fatal โดยไม่บอกสาเหตุ
  if (!isCommit(baseline)) {
    throw new Error(
      `changelog.json อ้าง commit ${baseline} ที่ไม่มีในรีโปนี้ — รัน \`bun scripts/changelog-cli.ts --rebuild\` ก่อน`,
    );
  }

  const entry: VersionEntry = {
    version: params.target,
    build: params.fullVersion,
    date: new Date().toISOString().slice(0, 10),
    commit: params.fullVersion.split(".").pop() as string,
    changes: buildChanges(`${baseline}..HEAD`),
  };
  changelog.versions.unshift(entry);
  changelog.current = params.target;
  changelog.generated_at = new Date().toISOString();
  writeAll(changelog);
  console.log(`▸ changelog ........ +${countChanges(entry)} รายการ (${baseline}..HEAD) ✓`);
}

/**
 * สร้าง changelog.json ใหม่ทั้งไฟล์จาก git tag — bootstrap ทับของเดิมทั้งหมด
 *
 * หนึ่ง entry ต่อหนึ่ง tag ช่วงของ tag ที่ n คือ `<tag n-1>..<tag n>` ส่วน tag
 * เก่าสุดกินทั้งประวัติถึงตัวมันเอง · `commit` ของแต่ละ entry คือ commit ที่ tag ชี้
 * (= release commit) ช่วงของ recordRelease() ครั้งถัดไปจึงพอดีเป๊ะ
 */
export function rebuildFromTags(): void {
  const raw = git("tag", "--list", "v*", "--sort=v:refname");
  const tags = raw ? raw.split("\n") : [];
  if (tags.length === 0) throw new Error("ไม่มี tag v* ให้ rebuild");

  const entries: VersionEntry[] = tags.map((tag, index) => {
    const previous = index === 0 ? null : tags[index - 1];
    const commit = git("rev-list", "-n", "1", "--abbrev-commit", tag);
    const date = git("log", "-1", "--format=%ad", "--date=short", tag);
    const version = tag.replace(/^v/, "");
    const entry: VersionEntry = {
      version,
      build: `${version}-build.${date.replace(/-/g, "")}.${commit}`,
      date,
      commit,
      changes: buildChanges(previous ? `${previous}..${tag}` : tag),
    };
    if (index === 0) entry.note = "init";
    return entry;
  });
  entries.reverse(); // ใหม่สุดอยู่บน — lib/changelog.ts:37 อ่าน versions[0] เป็น LATEST

  writeAll({
    current: entries[0].version,
    generated_at: new Date().toISOString(),
    versions: entries,
  });
  for (const entry of entries) {
    console.log(`  v${entry.version.padEnd(8)} ${String(countChanges(entry)).padStart(3)} รายการ  ${entry.date}`);
  }
  console.log(`✓ rebuild ${entries.length} เวอร์ชันจาก git tag`);
}
```

- [ ] **Step 2: สร้าง `scripts/changelog-cli.ts`**

```ts
#!/usr/bin/env bun
/**
 * จุดเข้าใช้ changelog generator จาก command line
 *
 *   bun scripts/changelog-cli.ts             re-render CHANGELOG.md จาก changelog.json
 *   bun scripts/changelog-cli.ts --rebuild   สร้าง changelog.json ใหม่จาก git tag (ทับของเดิม)
 *
 * แยกจาก scripts/changelog.ts เพื่อให้ไฟล์นั้นเป็น library ที่ import แล้วไม่ทำอะไร
 * (bump.ts import มัน) — ตัวเลือกปกติอย่าง `import.meta.main` ใช้ไม่ได้เพราะ repo
 * ไม่ได้ติดตั้ง @types/bun แล้ว `bun run typecheck` จะแดง
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { readChangelog, rebuildFromTags, renderMarkdown } from "./changelog";

if (process.argv.includes("--rebuild")) {
  rebuildFromTags();
} else {
  writeFileSync(path.resolve(import.meta.dirname, "..", "CHANGELOG.md"), renderMarkdown(readChangelog()));
  console.log("✓ render CHANGELOG.md จาก changelog.json แล้ว");
}
```

- [ ] **Step 3: static check**

```bash
bun run typecheck && bun run lint
```
คาดหวัง: ผ่านทั้งคู่ · ถ้า `typecheck` บ่นเรื่อง `import.meta.dirname` ให้หยุดแล้วรายงาน — `vite.config.ts:28` และ `scripts/app-version.ts:22` ใช้ท่าเดียวกันและผ่านอยู่ จึงไม่ควรเกิด

- [ ] **Step 4: ตรวจว่า library ไม่มี side effect**

```bash
bun -e 'await import("./scripts/changelog.ts"); console.log("import แล้วไม่มีอะไรเกิดขึ้น ✓")'
git status --porcelain
```
คาดหวัง: พิมพ์ข้อความ ✓ และ `git status` ว่างเปล่า (ไม่มีไฟล์ถูกเขียน)

- [ ] **Step 5: Commit**

```bash
git add scripts/changelog.ts scripts/changelog-cli.ts
git commit -m "$(cat <<'EOF'
feat(changelog): generator สร้าง changelog จาก git history

ยกมาจาก generate-changelog.ts ของ backend-gateway แล้วดัดแปลง 3 จุด:

- เดิน merge บน first-parent ทุกตัว ไม่ใช่เฉพาะที่มีเลข PR — รีโปนี้ merge
  branch ในเครื่อง 33 จาก 108 ตัวซึ่งไม่มีเลข PR ต้นฉบับจะทิ้ง commit ทั้งสาขา
- ใช้ type จาก lib/changelog.ts ที่เดียว ไม่ประกาศ interface ซ้ำ
- ตรวจว่า baseline commit มีอยู่จริงก่อนใช้ พร้อมบอกวิธีแก้

แยก CLI ออกเป็นไฟล์ของตัวเองเพื่อให้ตัว library ไม่มี side effect ตอน import
(import.meta.main ใช้ไม่ได้เพราะไม่มี @types/bun)
EOF
)"
```

---

### Task 3: bootstrap changelog.json จาก git tag

**Files:**
- Modify: `changelog.json` (เขียนทับทั้งไฟล์)
- Create: `CHANGELOG.md`

**Interfaces:**
- Consumes: `rebuildFromTags()` จาก Task 2 ผ่าน `scripts/changelog-cli.ts --rebuild`
- Produces: `changelog.json` ที่ `versions[0].commit` = `0f6ec40` — Task 4 ใช้เป็น baseline ของ release ถัดไป

> **ทำไมต้องมี task นี้:** `changelog.json` ปัจจุบันถูก copy ติดมาตอน port จาก Next.js app
> baseline `dbf5ae2b` ไม่มีอยู่ในรีโปนี้ (`git cat-file -t dbf5ae2b` → `Not a valid object name`)
> ถ้าไม่ rebuild ก่อน `recordRelease()` จะ throw ทันทีในการ bump ครั้งแรก

- [ ] **Step 1: จดตัวเลขตั้งต้นไว้เทียบ**

```bash
git log v1.1.0..v1.2.0 --no-merges --pretty=format:%s | grep -cE '^(feat|fix|perf|refactor)(\([^)]+\))?!?: '
```
คาดหวัง: `57` (ยืนยันแล้ว 2026-08-10) — ตัวเลขนี้นับเฉพาะ commit ที่ `git log <range>` มองเห็น จำนวนใน changelog อาจ **มากกว่า** เล็กน้อยได้ เพราะ generator ไล่เข้าไปในสาขาที่ merge เข้ามาด้วย

- [ ] **Step 2: rebuild**

```bash
bun scripts/changelog-cli.ts --rebuild
```
คาดหวัง: พิมพ์สองบรรทัด `v1.1.0 …` และ `v1.2.0 …` พร้อมจำนวนรายการ แล้วปิดท้าย `✓ rebuild 2 เวอร์ชันจาก git tag`

- [ ] **Step 3: ตรวจผลลัพธ์**

```bash
bun -e 'const c = require("./changelog.json");
console.log("current:", c.current);
console.log("entries:", c.versions.map(v => `${v.version} ${v.date} ${v.commit} +${v.changes.added.length}/${v.changes.fixed.length}/${v.changes.changed.length}`));'
```
คาดหวังทุกข้อ:
- `current` = `1.2.0` ตรงกับ `package.json`
- entry แรก = `1.2.0` `2026-08-09` `0f6ec40` · entry ที่สอง = `1.1.0` `2026-08-05` `3221799`
- entry `1.2.0` มีรายการรวมประมาณ 57 (ไม่ต่ำกว่านี้มาก — ถ้าได้เลขน้อยกว่านี้ชัดเจน แปลว่า `collectCommits()` ข้ามสาขาที่ merge แบบไม่มีเลข PR ให้หยุดแล้วรายงาน)

- [ ] **Step 4: ตรวจว่า commit จากสาขาที่ merge แบบไม่มีเลข PR ติดมาจริง**

นี่คือด่านที่พิสูจน์ว่าการดัดแปลงข้อ (ก) ทำงาน — `53420c7` เป็น commit ในสาขาที่ merge เข้ามาด้วย `a7a1709 merge: หน้ารับคำเชิญ…` ซึ่ง**ไม่มีเลข PR**

```bash
grep -c '53420c7' changelog.json
```
คาดหวัง: `1` — ถ้าได้ `0` แปลว่า generator ยังข้าม merge ที่ไม่มีเลข PR อยู่ ให้กลับไปแก้ `collectCommits()` ใน Task 2

- [ ] **Step 5: ตรวจ CHANGELOG.md และเส้นทาง re-render**

```bash
head -30 CHANGELOG.md
cp CHANGELOG.md /tmp/changelog-before.md
bun scripts/changelog-cli.ts
diff /tmp/changelog-before.md CHANGELOG.md && echo "re-render ได้ผลเท่าเดิม ✓"
```
คาดหวัง: หัวข้อ `## [1.2.0] - 2026-08-09` ตามด้วย `### Added` และรายการที่อ่านรู้เรื่อง
มีชื่อผู้เขียนกับ short hash · การรัน CLI เปล่า ๆ (ไม่ใส่ `--rebuild`) ต้องได้ไฟล์เดิมเป๊ะ
— พิสูจน์ว่า `renderMarkdown()` เป็น pure และ CLI ทั้งสองโหมดไม่ปนกัน

- [ ] **Step 6: เทสต์ชุดเดิมต้องไม่แดง**

```bash
bun test:run
```
คาดหวัง: เขียวทั้งหมด — `lib/__tests__/changelog.test.ts:3` mock `@/changelog.json` ทั้งก้อน ไฟล์จริงที่เปลี่ยนจึงไม่ควรกระทบ ถ้าแดงให้หยุดแล้วรายงาน

- [ ] **Step 7: Commit**

```bash
git add changelog.json CHANGELOG.md
git commit -m "$(cat <<'EOF'
chore(changelog): สร้าง changelog.json ใหม่จาก git tag ของรีโปนี้

ของเดิมถูก copy ติดมาตอน port จาก Next.js app — baseline commit dbf5ae2b
ไม่มีอยู่ในรีโปนี้ และ current ค้างที่ 1.0.1 ขณะ package.json ไปถึง 1.2.0 แล้ว

สร้างใหม่เป็น entry ต่อ tag (v1.1.0, v1.2.0) พร้อม CHANGELOG.md
current จึงตรงกับ package.json และ What's New dialog แสดงเวอร์ชันที่ถูกต้อง
EOF
)"
```

---

### Task 4: bump.ts เขียน changelog + commit เอง

**Files:**
- Modify: `scripts/bump.ts` (import, ค่าคงที่, ฟังก์ชันใหม่ 3 ตัว, `main()` ท่อนท้าย)
- Modify: `package.json` (อาจมีการจัดรูปแบบใหม่จาก JSON round-trip — ดู Step 5)
- Modify: `CLAUDE.md` (คำอธิบาย `build:bump` + ลบ known open item)

**Interfaces:**
- Consumes: `recordRelease({ target, fullVersion })` จาก Task 2 · `changelog.json` ที่ bootstrap แล้วจาก Task 3
- Produces: `bun run build:bump` ที่ commit ครบ 3 ไฟล์ (ไม่มี task ถัดไปใช้ต่อ)

- [ ] **Step 1: เพิ่ม import และค่าคงที่**

แก้บรรทัด 1-3 ของ `scripts/bump.ts` จาก:
```ts
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
```
เป็น:
```ts
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { recordRelease } from "./changelog";
```

แล้วเพิ่มต่อจากบล็อก `const LEVELS = [...] as const;` / `type Level = ...`:

```ts
/**
 * ไฟล์ที่ประกอบเป็น release commit — `git add` รับเฉพาะลิสต์นี้ ไฟล์แปลกปลอมที่
 * โผล่มาระหว่าง guard กับ commit จึงติดเข้า release ไปด้วยไม่ได้
 */
const RELEASE_FILES = ["package.json", "changelog.json", "CHANGELOG.md"];

const RESTORE_HINT = `  กู้คืนด้วย: git restore --staged --worktree ${RELEASE_FILES.join(" ")}`;
```

- [ ] **Step 2: เพิ่มฟังก์ชันใหม่ 3 ตัว**

วางต่อจาก `tryGit()` (จบที่บรรทัด 34):

```ts
/**
 * `git()` variant ที่คืน false แทนการ exit — ใช้กับขั้นตอนหลังจากเริ่มเขียนไฟล์แล้ว
 * ซึ่งความล้มเหลวแต่ละจุดมีวิธีกู้คืนคนละแบบ ต้องพิมพ์ให้ตรงจุดก่อนตาย
 */
function gitTry(...args: string[]): boolean {
  return spawnSync("git", args, { stdio: "inherit" }).status === 0;
}

/**
 * เขียนเวอร์ชันลง package.json แบบ in-place
 *
 * ตรวจรูปแบบก่อนเขียนเป็นด่านสุดท้าย ไม่ใช่ด่านแรก: ถ้ามีบั๊กที่ต้นทางส่งค่าที่ไม่ใช่
 * string มาถึงตรงนี้ `JSON.stringify` จะ **ทิ้งคีย์ version ทั้งคีย์เงียบ ๆ**
 * ได้ package.json ที่พังโดยไม่มี error ที่ไหนเลย
 */
function writePackageVersion(version: string): void {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`เวอร์ชันไม่ถูกรูปแบบ MAJOR.MINOR.PATCH: ${version}`);
  }
  const pkg = JSON.parse(readFileSync("package.json", "utf8")) as Record<string, unknown>;
  pkg.version = version;
  writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
}

/**
 * stage เฉพาะ RELEASE_FILES แล้ว commit ก่อน จึงค่อย tag — แยกเป็นสองหน้าต่างเพราะ
 * วิธีกู้คืนไม่เหมือนกัน: ก่อน commit สำเร็จคือคืนไฟล์ทิ้ง หลัง commit สำเร็จแล้ว
 * tag พังคือเลือกว่าจะ tag ต่อหรือถอย commit
 */
function commitAndTag(target: string): void {
  const tag = `v${target}`;
  if (!gitTry("add", ...RELEASE_FILES) || !gitTry("commit", "-m", `chore(release): ${tag}`)) {
    console.error("✗ commit ไม่สำเร็จ");
    console.error(RESTORE_HINT);
    process.exit(1);
  }
  if (!gitTry("tag", "-a", tag, "-m", tag) || tryGit("tag", "--list", tag) !== tag) {
    console.error(`✗ สร้าง tag ${tag} ไม่สำเร็จ — release commit ถูกสร้างไปแล้ว`);
    console.error(`  ไปต่อ: git tag -a ${tag} -m "${tag}"`);
    console.error("  ถอย  : git reset --hard HEAD~1");
    process.exit(1);
  }
}
```

- [ ] **Step 3: แก้คอมเมนต์ของ `gate()` ให้ตรงเหตุผลใหม่**

ใน docblock ของ `gate()` (บรรทัด ~163-174) แทนที่ย่อหน้าที่ขึ้นต้นด้วย
`A gate must never write a git-tracked file.` จนจบย่อหน้า ด้วย:

```
 * A gate must never write a git-tracked file. The release commit is built from
 * an exact list of paths (`RELEASE_FILES`), so a gate that dirtied a tracked
 * file outside that list would not fail the release — it would silently leave
 * the file dirty in the tree afterwards; one inside the list would ride along
 * into the release commit. Today that is safe only because `tsconfig.json`'s
 * `"incremental": true` writes `tsconfig.tsbuildinfo`, which `.gitignore`
 * excludes.
```

- [ ] **Step 4: เปลี่ยนท่อนท้ายของ `main()`**

แทนที่ตั้งแต่บรรทัด `const bump = spawnSync("bun", ["pm", "version", ...` จนถึงบรรทัด
`console.log(\`✓ v${target}\`);` (คือทั้งบล็อก `bun pm version` และการตรวจ tag ที่ตามมา) ด้วย:

```ts
  // hash ตรงนี้คือ HEAD **ก่อน** release commit เพราะ changelog ต้องถูกเขียนก่อน
  // จึงจะ commit ได้ — ฟิลด์ `commit` ของ entry ใช้ค่าเดียวกันนี้
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fullVersion = `${target}-build.${stamp}.${git("rev-parse", "--short", "HEAD")}`;

  try {
    writePackageVersion(target);
    recordRelease({ target, fullVersion });
  } catch (err) {
    console.error(`✗ เขียน package.json / changelog ไม่สำเร็จ: ${String(err)}`);
    console.error(RESTORE_HINT);
    process.exit(1);
  }

  commitAndTag(target);

  console.log(`✓ v${target}`);
  console.log(`  version  ${fullVersion}`);
```

บรรทัดที่เหลือของ `main()` (`commit`, `tag`, `→ ขั้นต่อไป: git push …`) คงเดิม

- [ ] **Step 5: จัดรูปแบบ package.json ให้ตรงกับสิ่งที่ writePackageVersion จะเขียน**

`JSON.stringify(pkg, null, 2)` จะกาง `"trustedDependencies": ["unrs-resolver"]` เป็นหลายบรรทัด
ถ้าไม่ทำตอนนี้ ความเปลี่ยนแปลงนั้นจะไปโผล่ปนใน release commit แรกโดยไม่เกี่ยวกับ release

```bash
bun -e 'const fs=require("fs"); const p=JSON.parse(fs.readFileSync("package.json","utf8")); fs.writeFileSync("package.json", JSON.stringify(p,null,2)+"\n")'
git diff --stat package.json
git diff package.json
```
คาดหวัง: diff มีแต่การจัดรูปแบบ (ไม่มีค่าใดเปลี่ยน) — ถ้า diff ว่างเปล่ายิ่งดี ข้ามไปได้เลย
**ถ้ามีค่าใดหายหรือเปลี่ยน ให้ `git checkout package.json` แล้วหยุดรายงานทันที**

- [ ] **Step 6: static check**

```bash
bun run typecheck && bun run lint && bun test:run
```
คาดหวัง: เขียวทั้งสาม

- [ ] **Step 7: อัปเดต CLAUDE.md**

(1) แทนที่บรรทัดคำอธิบาย `build:bump` — ของเดิมขึ้นต้นด้วย
`bun run build:bump [patch|minor|major]   # ตัด release: bump package.json + commit + annotated tag` —
ด้วยข้อความเดิมที่แก้ส่วน "bump package.json" เป็น:
```
bun run build:bump [patch|minor|major]   # ตัด release: bump package.json + generate changelog.json/CHANGELOG.md + commit + annotated tag (local เท่านั้น ไม่ push) — ต้องอยู่บน main, tree สะอาด, ไม่ตามหลัง origin/main; gate typecheck+lint+test:run; ไม่ส่ง level = ถามใน terminal
bun scripts/changelog-cli.ts [--rebuild]  # render CHANGELOG.md ใหม่จาก changelog.json (--rebuild = สร้าง changelog.json ใหม่จาก git tag ทับของเดิม)
```

(2) **ลบ** bullet สุดท้ายของหัวข้อ Known open items ทั้งย่อหน้า — ตัวที่ขึ้นต้นด้วย
`- After the first \`build:bump\`, the footer's version and \`changelog.json\`'s newest entry` และจบที่
`(\`components/footer/whats-new-dialog.tsx\`) shows an older version heading than the button that opened it. Known, not a bug; the fix is a changelog generator (separate work).`

- [ ] **Step 8: ทดสอบ build:bump ของจริงแล้วถอย**

⚠️ ขั้นนี้สร้าง commit + tag จริง และ `assertBranchAndTree()` บังคับให้อยู่บน `main`
กับ tree สะอาด — จึงต้อง merge งานเข้า main ก่อน ถ้ายังไม่พร้อม merge ให้ **ข้ามขั้นนี้
แล้วรายงานว่ายังไม่ได้ทดสอบ end-to-end** อย่าแก้ guard เพื่อให้รันผ่าน

ถ้าพร้อมทดสอบ:
```bash
# บน main, tree สะอาด
bun run build:bump patch
```
ตรวจก่อนถอย:
```bash
git show --stat HEAD          # ต้องมี 3 ไฟล์: package.json, changelog.json, CHANGELOG.md
git cat-file -t "v$(bun -e 'console.log(require("./package.json").version)')"   # ต้องได้ "tag" (annotated)
bun -e 'const c=require("./changelog.json"); console.log(c.current, c.versions.length, c.versions[0].build)'
```
ถอย:
```bash
V=$(bun -e 'console.log(require("./package.json").version)')
git tag -d "v$V" && git reset --hard HEAD~1
```

- [ ] **Step 9: Commit**

```bash
git add scripts/bump.ts package.json CLAUDE.md
git commit -m "$(cat <<'EOF'
feat(bump): build:bump เขียน changelog เองและ commit ไฟล์ที่ระบุชัด

เลิกใช้ `bun pm version` เพราะมัน commit ให้เองและ commit ได้แค่ package.json
พอต้อง commit changelog.json ด้วยจึงต้องเขียน git เอง — เขียนเวอร์ชัน,
เรียก recordRelease(), git add เฉพาะ RELEASE_FILES, commit, แล้ว tag

ข้อความกู้คืนแยกตามหน้าต่างที่พัง: ก่อน commit สำเร็จคือคืนไฟล์
หลัง commit สำเร็จแล้ว tag พังคือเลือก tag ต่อหรือถอย commit

จัดรูปแบบ package.json ให้ตรงกับที่ JSON round-trip จะเขียน เพื่อไม่ให้ความ
เปลี่ยนแปลงนี้ไปปนใน release commit แรก
EOF
)"
```

---

## หลังจบทุก task

- [ ] `bun run typecheck && bun run lint && bun test:run` เขียวทั้งหมด
- [ ] `bun run build:local && bun run preview` → เปิดเบราว์เซอร์ ตรวจ Network ว่าแอปยิงไปที่ `localhost:4000` (พิสูจน์ว่าบันเดิลจริงหยิบ config ตาม env ที่สั่ง ไม่ใช่แค่ไฟล์ใน dist ถูก)
- [ ] เปิด `bun dev` กดเวอร์ชันที่ footer → What's New dialog ต้องขึ้นหัวข้อ `v1.2.0` ตรงกับปุ่มที่กด (นี่คือ known open item ที่ปิดไป)
- [ ] `git diff main --stat` ทบทวนว่าไม่มีไฟล์นอกขอบเขตถูกแตะ
- [ ] รายงานว่า Step 8 ของ Task 4 ได้ทดสอบจริงหรือข้ามไป
