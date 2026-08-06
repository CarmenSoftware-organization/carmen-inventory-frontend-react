# build:bump + version pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม `bun run build:bump` ที่ตัด release (bump `package.json` → release commit → annotated tag, local อย่างเดียว) และทำให้เวอร์ชันที่ footer แสดงเดินตาม `package.json` โดยอัตโนมัติ

**Architecture:** `package.json.version` เป็นแหล่งความจริงแหล่งเดียว → `scripts/app-version.ts` อ่านค่าให้ `vite.config.ts` และ `vitest.config.ts` ฉีดเข้า bundle ผ่าน `define: { __APP_VERSION__ }` → `lib/version.ts` ส่งต่อให้ `status-bar.tsx` ส่วน `scripts/bump.ts` เป็น port ตรงตัวจาก `../carmen-inventory-god-mode/scripts/bump.ts` โดยห่อ `bun pm version` ด้วย guard (branch/tree/upstream/tag) และ gate (typecheck/lint/test:run)

**Tech Stack:** Bun 1.3.14 · TypeScript 5.9 (`tsc --noEmit`) · Vite 7 · Vitest 4 · `node:child_process` / `node:fs` / `node:readline` (ไม่ใช้ `Bun.*` global — repo ไม่ได้ติดตั้ง `@types/bun`)

**Spec:** `docs/superpowers/specs/2026-08-05-build-bump-design.md`

**Branch:** `feature/build-bump-script` (สร้างแล้ว มี commit spec `5935e7d` อยู่)

## Global Constraints

- **ไม่เพิ่ม dependency ใหม่แม้แต่ตัวเดียว** — ใช้ `node:*` API ที่ `@types/node` ครอบอยู่แล้ว
- **ห้ามใช้ `Bun.*` global** (เช่น `Bun.spawnSync`) — repo ไม่มี `bun-types` / `@types/bun` จะตก typecheck
- `tsconfig.json` include `**/*.ts` ⇒ ทุกไฟล์ใน `scripts/` ถูก typecheck ด้วย `tsc --noEmit`
- **commit message เป็นภาษาไทย** ตามกฎ `CLAUDE.md` ของ repo ยกเว้น `chore(release): v%s` ที่ `bun pm version` สร้าง (ไม่มีข้อความบรรยาย มีแค่ conventional type + เลขเวอร์ชัน)
- **ไม่เขียนไฟล์เทสต์ใหม่** (`*.test.ts` / `*.test.tsx`) ตาม preference ประจำของ user — แต่ static check (`tsc --noEmit`, `eslint`) และ **เทสต์ชุดเดิมที่มีอยู่ต้องเขียว 100%** ทุกครั้งก่อน commit
- **ห้ามแตะ** `changelog.json` · `lib/changelog.ts` · `hooks/use-whats-new.ts` · `components/footer/whats-new-dialog.tsx`
- **ห้ามแตะ script `build`** เดิม (`tsc --noEmit && vite build`) — CI เรียกมันอยู่
- **ห้าม push และห้ามสร้าง tag บน repo จริง** ในทุก task — การทดสอบ `build:bump` ทำใน git repo ทิ้งใต้ scratchpad เท่านั้น
- คำสั่งตรวจมาตรฐาน (ท่องให้ขึ้นใจ): `bunx tsc --noEmit` · `bun run lint` · `bun test:run`

---

## File Structure

| ไฟล์ | หน้าที่ | Task |
| --- | --- | --- |
| `package.json` | แหล่งความจริงของเวอร์ชัน + ที่อยู่ของ script | 1, 3 |
| `scripts/app-version.ts` | **ใหม่** — อ่าน `version` จาก `package.json` หน้าที่เดียว ไม่มี side effect | 2 |
| `vite.config.ts` | ฉีด `__APP_VERSION__` เข้า bundle (dev + build) | 2 |
| `vitest.config.ts` | ฉีด `__APP_VERSION__` ให้ตอนรันเทสต์ | 2 |
| `types/global.d.ts` | ประกาศชนิดของ `__APP_VERSION__` ให้ TypeScript | 2 |
| `lib/version.ts` | ส่งต่อค่าที่ define ให้ผู้ใช้งานในแอป | 2 |
| `components/footer/status-bar.tsx` | แสดงเวอร์ชันบน footer | 2 |
| `scripts/bump.ts` | **ใหม่** — guard + prompt + gate + `bun pm version` | 3 |
| `CLAUDE.md` | บล็อก Commands ที่เป็นดัชนีของ script ทั้งหมด | 3 |

---

### Task 1: จัดแนวเวอร์ชันตั้งต้นเป็น 1.0.1

**Files:**
- Modify: `package.json:3`

**Interfaces:**
- Consumes: ไม่มี
- Produces: `package.json.version === "1.0.1"` — Task 2 และ Task 3 อ้างค่านี้ทั้งคู่ (footer ต้องขึ้น `v1.0.1` และ prompt ของ bump ต้องเสนอ `1.0.2 / 1.1.0 / 2.0.0`)

**บริบท:** `package.json` อยู่ที่ `0.1.0` และไม่เคยขยับ (`git tag` = 0 tag) ขณะที่ footer แสดง `v1.0.1` มาตั้งแต่ 2026-05-27 ถ้า bump จาก `0.1.0` ตรง ๆ ผู้ใช้จะเห็นเลขถอยหลัง `1.0.1 → 0.1.1`

- [ ] **Step 1: แก้ฟิลด์ version**

`package.json` บรรทัด 3 — เปลี่ยน

```json
  "version": "0.1.0",
```

เป็น

```json
  "version": "1.0.1",
```

**ห้ามแก้ฟิลด์อื่นในไฟล์นี้ใน task นี้**

- [ ] **Step 2: ยืนยันว่าไม่มีอะไรพัง**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```

Expected: ผ่านทั้งสามคำสั่ง (ตอนนี้ยังไม่มีโค้ดไหนอ่านฟิลด์นี้ จึงต้องไม่มีอะไรเปลี่ยน)

- [ ] **Step 3: ยืนยันว่าไม่ได้สร้าง tag**

```bash
git tag --list
```

Expected: **ว่างเปล่า** — เวอร์ชัน 1.0.1 ถูกปล่อยตั้งแต่ 2026-05-27 บนแอปเดิม ไม่มี commit ไหนใน repo นี้ที่ตรงกับมัน การแปะ tag ย้อนหลังบน HEAD วันนี้คือการโกหกประวัติ tag แรกจริงจะมาจาก `build:bump` ครั้งแรก

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "$(cat <<'EOF'
chore: จัดแนว package.json version เป็น 1.0.1 ให้ตรงกับที่ footer แสดง

package.json ค้างที่ 0.1.0 มาตลอดและไม่เคยมี tag ขณะที่ผู้ใช้เห็น v1.0.1
มาตั้งแต่ 2026-05-27 ไม่สร้าง tag v1.0.1 ย้อนหลัง เพราะไม่มี commit ไหนใน
repo นี้ที่ตรงกับ release นั้น

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: ท่อส่งเวอร์ชัน — ให้ footer อ่านจาก package.json

**Files:**
- Create: `scripts/app-version.ts`
- Modify: `vite.config.ts` (เพิ่ม import + คีย์ `define`)
- Modify: `vitest.config.ts` (เพิ่ม import + คีย์ `define`)
- Modify: `types/global.d.ts`
- Modify: `lib/version.ts` (แทนที่ทั้งไฟล์)
- Modify: `components/footer/status-bar.tsx:16,40,86`

**Interfaces:**
- Consumes: `package.json.version === "1.0.1"` จาก Task 1
- Produces:
  - `appVersion(): string` จาก `scripts/app-version.ts` — throw ถ้าไม่มีฟิลด์ `version`
  - global `__APP_VERSION__: string` (vite `define` แทนค่าตอน transform)
  - `APP_VERSION: string` จาก `lib/version.ts` — **ไม่มี suffix แล้ว** ผู้เรียกไม่ต้อง `.split("-")`

**บริบท:** `lib/version.ts` เป็น literal `"1.0.1-build.20260527.dbf5ae2b"` ที่ค้างมาตั้งแต่ 2026-05-27 ไม่มี generator (`docs/code-review/2026-06-12-raw-findings.json` flag ไว้แล้วว่า "will silently drift") และ `status-bar.tsx:40` ตัด suffix ทิ้งด้วย `.split("-")[0]` ทุกครั้ง ⇒ suffix ไม่เคยถูกแสดงเลย

- [ ] **Step 1: สร้าง `scripts/app-version.ts`**

```ts
import fs from "node:fs";
import path from "node:path";

/**
 * เวอร์ชันแอปจาก `package.json` — แหล่งความจริงแหล่งเดียว
 *
 * ใช้โดย `vite.config.ts` และ `vitest.config.ts` เพื่อ define `__APP_VERSION__`
 * เข้า bundle ตอน build แทนการ hardcode ไว้ใน `lib/version.ts` (ของเดิม hardcode
 * ค้างตั้งแต่ 2026-05-27 แล้ว drift เงียบ ๆ) bump ด้วย `bun run build:bump`
 *
 * แยกเป็นไฟล์ของตัวเองแทนที่จะ copy ลงสอง config เพราะสำเนาสองชุดที่ต้อง sync
 * กันเองคือปัญหาที่ทั้งหมดนี้กำลังแก้อยู่พอดี
 *
 * @returns เลข semver จากฟิลด์ `version`
 * @throws ถ้าไม่มีฟิลด์ `version` ที่เป็น string — ดีกว่าฉีด `undefined` เข้า bundle เงียบ ๆ
 * @example
 * ```ts
 * define: { __APP_VERSION__: JSON.stringify(appVersion()) }
 * ```
 */
export function appVersion(): string {
  const file = path.resolve(import.meta.dirname, "..", "package.json");
  const pkg = JSON.parse(fs.readFileSync(file, "utf8")) as { version?: unknown };
  if (typeof pkg.version !== "string") {
    throw new Error(`${file} ไม่มีฟิลด์ version`);
  }
  return pkg.version;
}
```

- [ ] **Step 2: เพิ่ม `define` ใน `vite.config.ts`**

เพิ่มบรรทัด import ต่อจาก `import { type Plugin, defineConfig } from "vite";`

```ts
import { appVersion } from "./scripts/app-version";
```

แล้วในอ็อบเจกต์ที่ `defineConfig` คืนออกมา แทรกคีย์ `define` ระหว่าง `plugins` กับ `resolve` — จากเดิม

```ts
    tailwindcss(),
  ],
  resolve: {
```

เป็น

```ts
    tailwindcss(),
  ],
  // เวอร์ชันที่ footer แสดง มาจาก package.json ที่เดียว — ฉีดเข้า bundle ตอน build
  // แทน literal ใน lib/version.ts ที่ต้องแก้มือ (ของเดิมค้างตั้งแต่ 2026-05-27)
  // bump ด้วย `bun run build:bump`
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  resolve: {
```

- [ ] **Step 3: เพิ่ม `define` ใน `vitest.config.ts`**

เพิ่มบรรทัด import ต่อจาก `import { defineConfig } from "vitest/config";`

```ts
import { appVersion } from "./scripts/app-version";
```

แล้วแทรกคีย์ `define` ก่อน `resolve` — จากเดิม

```ts
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  resolve: {
```

เป็น

```ts
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  // ต้องมีคู่กับ vite.config.ts ไม่งั้นเทสต์ที่ import lib/version.ts จะพังด้วย
  // ReferenceError: __APP_VERSION__ is not defined
  define: {
    __APP_VERSION__: JSON.stringify(appVersion()),
  },
  resolve: {
```

- [ ] **Step 4: ประกาศชนิดใน `types/global.d.ts`**

แทนที่ทั้งไฟล์ด้วย

```ts
declare module "*.css" {}

/** เวอร์ชันแอปจาก package.json — vite `define` แทนค่าให้ตอน transform (ดู scripts/app-version.ts) */
declare const __APP_VERSION__: string;
```

- [ ] **Step 5: แทนที่ `lib/version.ts` ทั้งไฟล์**

```ts
/**
 * เวอร์ชันแอปที่ footer แสดง — ฉีดตอน build จากฟิลด์ `version` ของ `package.json`
 * (ดูคีย์ `define` ใน vite.config.ts / vitest.config.ts) bump ด้วย `bun run build:bump`
 */
export const APP_VERSION = __APP_VERSION__;
```

- [ ] **Step 6: แก้ `components/footer/status-bar.tsx`**

6.1 — JSDoc บรรทัด 16 จากเดิม

```
 * ด้านขวา เวอร์ชันอ่านจาก `lib/version.ts` (`APP_VERSION`) คลิกที่ปุ่ม
```

เป็น

```
 * ด้านขวา เวอร์ชัน (`APP_VERSION`) ฉีดตอน build จาก `package.json` คลิกที่ปุ่ม
```

6.2 — ลบบรรทัด 40 ทิ้งทั้งบรรทัด (ไม่มี suffix ให้ตัดแล้ว)

```ts
  const version = APP_VERSION.split("-")[0];
```

6.3 — บรรทัด 86 จากเดิม

```tsx
            <span>v{version}</span>
```

เป็น

```tsx
            <span>v{APP_VERSION}</span>
```

- [ ] **Step 7: Static check + เทสต์ชุดเดิม**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```

Expected: ผ่านทั้งสาม ถ้า `bun run lint` ฟ้อง `no-undef` ที่ `__APP_VERSION__` ให้ตรวจก่อนว่า `types/global.d.ts` ถูกแก้ครบตาม Step 4 แล้ว (typescript-eslint ปิด `no-undef` เป็นค่าเริ่มต้น เพราะ TypeScript ตรวจให้อยู่แล้ว — ถ้ายังฟ้องแปลว่า global declaration ยังไม่ถูกอ่าน)

- [ ] **Step 8: ตรวจด้วยตาบน dev server**

```bash
bun dev
```

เปิด `http://localhost:3000` แล้วดู footer ขวาล่าง

Expected: ขึ้น **`v1.0.1`** — ไม่มี `-build.20260527.dbf5ae2b` ต่อท้าย (ยืนยันว่า define ทำงานใน dev ด้วย ไม่ใช่แค่ตอน build) กด `Ctrl-C` ปิด server เมื่อดูเสร็จ

- [ ] **Step 9: ตรวจว่าฉีดเข้า bundle จริง**

```bash
BUILD_CONFIG_FILE=config.sample.json bun run build && grep -ro '"1\.0\.1"' dist/assets/*.js | head -3
```

Expected: build สำเร็จ และ grep เจออย่างน้อยหนึ่งบรรทัด (ค่าถูกแทนที่เป็น string literal ในไฟล์ที่ bundle แล้ว)

> `BUILD_CONFIG_FILE=config.sample.json` จำเป็นเพราะ `public/config.prod.json` ถูก gitignore ไว้ — ค่าเริ่มต้นของ `emitBuildConfig()` จะหาไฟล์ไม่เจอ

- [ ] **Step 10: ล้าง artifact ของ build**

```bash
rm -rf dist && git status --porcelain
```

Expected: `git status --porcelain` แสดงเฉพาะ 6 ไฟล์ของ task นี้ ไม่มีอย่างอื่นหลุดมา

- [ ] **Step 11: Commit**

```bash
git add scripts/app-version.ts vite.config.ts vitest.config.ts types/global.d.ts lib/version.ts components/footer/status-bar.tsx
git commit -m "$(cat <<'EOF'
fix(version): ให้ footer อ่านเวอร์ชันจาก package.json แทน literal ที่ค้างมา 2 เดือน

lib/version.ts เป็น literal "1.0.1-build.20260527.dbf5ae2b" ที่ไม่มี generator
ตั้งแต่ 2026-05-27 (code review 2026-06-12 flag ไว้แล้ว) เปลี่ยนมาให้ vite define
ฉีดค่าจาก package.json ทั้งตอน dev และ build จึง drift ไม่ได้อีก

ตัด suffix -build.<date>.<sha> ทิ้ง — status-bar ตัดมันด้วย .split("-")[0] ทุกครั้ง
อยู่แล้ว จึงไม่เคยถูกแสดง และ sha ของ release commit ก็รู้ไม่ได้ก่อน commit

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `scripts/bump.ts` + script `build:bump`

**Files:**
- Create: `scripts/bump.ts` (คัดลอกจาก `../carmen-inventory-god-mode/scripts/bump.ts` แล้วแก้จุดเดียว)
- Modify: `package.json` (เพิ่ม `typecheck` + `build:bump` ใน `scripts`)
- Modify: `CLAUDE.md:19` (บล็อก Commands)

**Interfaces:**
- Consumes: `package.json.version === "1.0.1"` จาก Task 1 · script `lint` และ `test:run` ที่มีอยู่แล้ว · script `typecheck` ที่ task นี้เพิ่มเอง
- Produces: `bun run build:bump [patch|minor|major]`

**บริบท:** ตรรกะทั้งหมดมาจาก `../carmen-inventory-god-mode/scripts/bump.ts` ซึ่งทดสอบกับ Bun 1.3.14 มาแล้ว (รุ่นเดียวกับที่ติดตั้งที่นี่) **อย่าเขียนใหม่จากศูนย์** — คอมเมนต์ในไฟล์นั้นบันทึกข้อสังเกตที่ได้จากการทดลองจริงไว้ เช่น ทำไมต้อง `for await (const line of rl)` แทน `rl.question()` และทำไมต้องเช็ค tag ก่อนเขียนไฟล์

- [ ] **Step 1: คัดลอกไฟล์ต้นฉบับ**

```bash
cp ../carmen-inventory-god-mode/scripts/bump.ts scripts/bump.ts
wc -l scripts/bump.ts
```

Expected: ได้ไฟล์ประมาณ 230 บรรทัด ถ้า `cp` ล้มเหลว (ไม่มี repo god-mode บนเครื่อง) **ให้หยุดแล้วรายงาน** — อย่าเขียนไฟล์ขึ้นใหม่เอง

- [ ] **Step 2: เพิ่ม gate `test:run`**

ใน `scripts/bump.ts` ฟังก์ชัน `main()` — จากเดิม

```ts
  gate("typecheck", "▸ typecheck ........ ✓");
  gate("lint", "▸ lint ............. ✓");
```

เป็น

```ts
  gate("typecheck", "▸ typecheck ........ ✓");
  gate("lint", "▸ lint ............. ✓");
  gate("test:run", "▸ tests ............ ✓");
```

**นี่คือความต่างจากต้นฉบับเพียงจุดเดียว** — god-mode ตัดเทสต์ออกเพราะ integration test ที่นั่นปลุก embedded-postgres ส่วนเทสต์ที่นี่เป็น vitest + jsdom ล้วน ไม่พึ่ง DB และไม่มี snapshot จึงไม่ทำ working tree สกปรก (เงื่อนไขจำเป็น: gate ที่ทำ tree สกปรกจะทำให้ `bun pm version` พังที่ขั้นสุดท้ายหลังผู้ใช้ตอบ prompt ไปแล้ว)

- [ ] **Step 3: เพิ่ม script ใน `package.json`**

ในอ็อบเจกต์ `scripts` — จากเดิม

```json
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
```

เป็น

```json
    "build": "tsc --noEmit && vite build",
    "build:bump": "bun scripts/bump.ts",
    "typecheck": "tsc --noEmit",
    "preview": "vite preview",
```

**ห้ามแก้บรรทัด `build`** — CI เรียกมันอยู่ การปล่อยให้ `tsc --noEmit` ซ้ำสองที่ ดีกว่าเสี่ยงกับ pipeline เพื่อ dedup หนึ่งบรรทัด

- [ ] **Step 4: อัปเดตบล็อก Commands ใน `CLAUDE.md`**

`CLAUDE.md` บรรทัด 19 — จากเดิม

```
bun run build        # tsc + vite build → dist/
```

เป็น

```
bun run build        # tsc + vite build → dist/
bun run typecheck    # tsc --noEmit เดี่ยว ๆ (gate ของ build:bump)
bun run build:bump [patch|minor|major]   # ตัด release: bump package.json + commit + annotated tag (local เท่านั้น ไม่ push) — ต้องอยู่บน main, tree สะอาด, ไม่ตามหลัง origin/main; gate typecheck+lint+test:run; ไม่ส่ง level = ถามใน terminal
```

- [ ] **Step 5: Static check + เทสต์ชุดเดิม**

```bash
bunx tsc --noEmit && bun run lint && bun test:run
```

Expected: ผ่านทั้งสาม (`scripts/bump.ts` อยู่ใน `include: ["**/*.ts"]` จึงถูก typecheck ด้วย)

- [ ] **Step 6: ทดสอบ happy path ใน git repo ทิ้ง**

**ห้ามรัน `build:bump` บน repo จริง** — มันจะสร้าง commit + tag ทันที ให้สร้าง repo จำลองที่มี script ชื่อเดียวกันแต่เป็น no-op แทน

```bash
SB=/private/tmp/claude-501/-Users-samutpra-GitHub-carmensoftware-organize-carmen-inventory-frontend-react/07b130ad-77c8-43ae-a1e4-f5b9544895c6/scratchpad/bump-probe
rm -rf "$SB" && mkdir -p "$SB/scripts"
cp scripts/bump.ts "$SB/scripts/bump.ts"
cat > "$SB/package.json" <<'JSON'
{
  "name": "bump-probe",
  "version": "1.0.1",
  "private": true,
  "scripts": {
    "typecheck": "echo typecheck-ok",
    "lint": "echo lint-ok",
    "test:run": "echo tests-ok",
    "build:bump": "bun scripts/bump.ts"
  }
}
JSON
git -C "$SB" init -b main -q
git -C "$SB" -c user.email=probe@local -c user.name=probe add -A
git -C "$SB" -c user.email=probe@local -c user.name=probe commit -qm "init"
cd "$SB" && bun run build:bump patch; cd - >/dev/null
```

Expected output ท้ายสุด:

```
▸ branch ........... main ✓
▸ working tree ..... clean ✓
▸ upstream ......... skip (ไม่มี upstream) ✓
▸ typecheck ........ ✓
▸ lint ............. ✓
▸ tests ............ ✓
✓ v1.0.2
  commit  chore(release): v1.0.2
  tag     v1.0.2 (annotated)

→ ขั้นต่อไป: git push origin main && git push origin v1.0.2
```

- [ ] **Step 7: ยืนยันผลลัพธ์ที่ repo ทิ้ง**

```bash
git -C "$SB" log --oneline -1
git -C "$SB" cat-file -t v1.0.2
git -C "$SB" show --stat --oneline HEAD | tail -3
grep '"version"' "$SB/package.json"
```

Expected ทีละบรรทัด:
- commit ล่าสุดคือ `chore(release): v1.0.2`
- `cat-file -t` คืน **`tag`** (annotated ไม่ใช่ lightweight)
- release commit แตะ **`package.json` ไฟล์เดียว**
- `"version": "1.0.2"`

- [ ] **Step 8: ยิง guard ทีละตัวที่ repo ทิ้ง**

```bash
# 8a — tag ปลายทางมีอยู่แล้ว (v1.0.2 เพิ่งถูกสร้างใน Step 6)
cd "$SB" && git reset -q --hard HEAD~1 && bun run build:bump patch; echo "exit=$?"; cd - >/dev/null
```
Expected: `✗ tag v1.0.2 มีอยู่แล้ว` และ `exit=1`

```bash
# 8b — working tree ไม่สะอาด
cd "$SB" && echo dirty > junk.txt && bun run build:bump minor; echo "exit=$?"; rm junk.txt; cd - >/dev/null
```
Expected: พิมพ์ผลของ `git status --porcelain` แล้ว `exit=1`

```bash
# 8c — ไม่ได้อยู่บน main
cd "$SB" && git checkout -qb feature/x && bun run build:bump minor; echo "exit=$?"; git checkout -q main; cd - >/dev/null
```
Expected: `✗ build:bump ต้องรันบน main (ตอนนี้อยู่ feature/x)` และ `exit=1`

```bash
# 8d — argument ผิด
cd "$SB" && bun run build:bump enormous; echo "exit=$?"; cd - >/dev/null
```
Expected: `✗ ระดับต้องเป็น patch|minor|major` และ `exit=1`

```bash
# 8e — ยกเลิกที่ prompt (EOF)
cd "$SB" && echo "" | bun run build:bump; echo "exit=$?"; cd - >/dev/null
```
Expected: เมนูสามระดับ (`1) patch → 1.0.2` ฯลฯ) ตามด้วย `ยกเลิก — ไม่มีอะไรเปลี่ยน` และ `exit=0`

- [ ] **Step 9: เก็บกวาด + ยืนยันว่า repo จริงไม่ถูกแตะ**

```bash
rm -rf "$SB"
git tag --list
git status --porcelain
```

Expected: `git tag --list` **ว่างเปล่า** (repo จริงยังไม่มี tag) และ `git status --porcelain` แสดงเฉพาะ `scripts/bump.ts`, `package.json`, `CLAUDE.md`

- [ ] **Step 10: Commit**

```bash
git add scripts/bump.ts package.json CLAUDE.md
git commit -m "$(cat <<'EOF'
feat(release): เพิ่ม bun run build:bump ตัด release commit + annotated tag

ยกตรรกะมาจาก carmen-inventory-god-mode/scripts/bump.ts (Bun 1.3.14 เหมือนกัน)
ห่อ bun pm version ด้วย guard branch=main / tree สะอาด / ไม่ตามหลัง origin/main /
tag ยังว่าง แล้ว gate ด้วย typecheck + lint + test:run ก่อนเขียนอะไรลงดิสก์

ต่างจากต้นฉบับจุดเดียวคือเพิ่ม gate test:run — เทสต์ที่นี่เป็น vitest+jsdom
ไม่พึ่ง DB ต่างจาก god-mode ที่ integration test ปลุก embedded-postgres

หยุดที่ commit + tag local ไม่ push: ความผิดพลาด local แก้ด้วย git reset +
git tag -d แต่ที่ push แล้วคือสาธารณะ

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage** — ไล่ทีละหัวข้อของ spec:

| ข้อกำหนดใน spec | Task |
| --- | --- |
| `scripts/app-version.ts` ใหม่ อ่าน `package.json` + throw ถ้าไม่มี `version` | 2 · Step 1 |
| `vite.config.ts` เพิ่ม `define` | 2 · Step 2 |
| `vitest.config.ts` เพิ่ม `define` ตัวเดียวกัน | 2 · Step 3 |
| `types/global.d.ts` เพิ่ม `declare const __APP_VERSION__` | 2 · Step 4 |
| `lib/version.ts` literal → อ่านจาก define | 2 · Step 5 |
| `status-bar.tsx` ลบ `.split("-")[0]` + แก้ JSDoc | 2 · Step 6 |
| `scripts/bump.ts` port ทั้งไฟล์ | 3 · Step 1 |
| เพิ่ม gate `test:run` เป็นจุดต่างเพียงจุดเดียว | 3 · Step 2 |
| `package.json` เพิ่ม `typecheck` + `build:bump` | 3 · Step 3 |
| `package.json` version → `1.0.1` | 1 · Step 1 |
| ไม่สร้าง tag `v1.0.1` | 1 · Step 3 (ตรวจ) · 3 · Step 9 (ตรวจซ้ำ) |
| ไม่แตะ `build` เดิม | 3 · Step 3 (ระบุห้ามไว้) |
| ไม่แตะ changelog / What's New | Global Constraints |
| Verify: tsc + lint + test เขียว | 1 · Step 2 · 2 · Step 7 · 3 · Step 5 |
| Verify: footer โชว์ `v1.0.1` บน dev | 2 · Step 8 |
| Verify: grep เจอค่าใน `dist/assets/*.js` | 2 · Step 9 |
| Verify: non-interactive path ใน repo ทิ้ง + annotated tag | 3 · Step 6-7 |
| Verify: ยิง guard ทีละตัว | 3 · Step 8 |

ไม่มีข้อกำหนดไหนไม่มี task รองรับ

**ส่วนที่เกินจาก spec หนึ่งจุด:** `CLAUDE.md` (Task 3 · Step 4) — spec ไม่ได้ระบุไว้ แต่บล็อก Commands ของ `CLAUDE.md` เป็นดัชนีของ script ทั้งหมดใน repo การเพิ่ม script โดยไม่แตะดัชนีจะทำให้เอกสารผิดทันที

**2. Placeholder scan** — ไม่มี `TBD` / `TODO` / "similar to Task N" / "add error handling" ทุก step ที่แตะโค้ดมี code block จริง คำสั่งตรวจทุกคำสั่งมี Expected ระบุไว้

**3. Type consistency** — `appVersion()` (Task 2 Step 1) ถูกเรียกด้วยชื่อเดียวกันใน Step 2 และ Step 3 · `__APP_VERSION__` สะกดตรงกันทั้ง 4 จุด (สอง config, `global.d.ts`, `lib/version.ts`) · `APP_VERSION` ที่ export จาก `lib/version.ts` ถูกใช้ใน `status-bar.tsx` ด้วยชื่อเดิม (import บรรทัด 8 ไม่ต้องแก้) · ชื่อ script `typecheck` / `lint` / `test:run` ที่ `gate()` เรียก ตรงกับที่ประกาศใน `package.json` และกับ repo จำลองใน Step 6
