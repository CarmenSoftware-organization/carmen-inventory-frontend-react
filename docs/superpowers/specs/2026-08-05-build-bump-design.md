# build:bump — release version bump + version pipeline

Date: 2026-08-05
Branch base: main (branch: `feature/build-bump-script`)

## Goal

เพิ่ม `bun run build:bump` ที่ตัด release: bump เวอร์ชันใน `package.json` สร้าง
release commit และ annotated tag — **local อย่างเดียว ไม่ push**

พร้อมกันนั้นทำให้เวอร์ชันที่ผู้ใช้เห็นใน footer เดินตาม `package.json` โดยอัตโนมัติ
แทนที่จะเป็น literal ที่ต้องแก้มือ ตรรกะของ script ยกมาจาก
`../carmen-inventory-god-mode/scripts/bump.ts` (spec:
`carmen-inventory-god-mode/docs/superpowers/specs/2026-08-05-build-bump-design.md`)

## Background

### สถานะปัจจุบัน — เวอร์ชันสามแหล่ง ไม่ตรงกันสักคู่

| แหล่ง | ค่า | สถานะ |
| --- | --- | --- |
| `package.json` `version` | `0.1.0` | ไม่เคยขยับ · `git tag` = **0 tag** |
| `lib/version.ts` `APP_VERSION` | `"1.0.1-build.20260527.dbf5ae2b"` | literal ค้างจาก 2026-05-27 ไม่มี generator |
| `changelog.json` `current` | `"1.0.1"` | generate 2026-05-27 ไม่มี generator |

`components/footer/status-bar.tsx:40` อ่าน `APP_VERSION` แล้ว `.split("-")[0]` ⇒ โชว์
`v1.0.1` ในทุก build ตั้งแต่นั้นมา ปัญหานี้ถูก flag ไว้แล้วใน
`docs/code-review/2026-06-12-raw-findings.json` ("will silently drift from the actual
deployed build unless someone remembers to hand-edit this file")

`APP_VERSION` มีผู้อ่านที่เดียวคือ `status-bar.tsx` และส่วนต่อท้าย `-build.<date>.<sha>`
**ไม่เคยถูกแสดงเลย** เพราะโดน `.split("-")[0]` ตัดทิ้งทุกครั้ง

### ต่างจาก god-mode ตรงไหน

god-mode เขียน spec ไว้ชัดว่า "displaying the version anywhere in the app UI" อยู่นอก
ขอบเขต — ที่นั่นทำได้เพราะฟิลด์ `version` เป็น write-only ไม่มี consumer ต้นทุนของการ
divergence จึงเป็นศูนย์ ที่นี่มี consumer จริง (footer + ปุ่มเปิด What's New) การ port
แบบตรงตัวจะได้ผลลัพธ์ที่ `package.json` เดินไป `0.1.1` แต่ผู้ใช้ยังเห็น `v1.0.1` ตลอดไป
— คือย้าย drift จาก "ไม่มีใครดู" ไปเป็น "ผู้ใช้เห็นเลขผิด"

### สิ่งที่ยืนยันด้วยการทดลองใน repo นี้ (2026-08-05)

- `bun --version` = **1.3.14** — รุ่นเดียวกับที่ god-mode ทดสอบพฤติกรรม `bun pm version` ไว้
  จึงยกข้อสังเกตของ spec นั้นมาใช้ได้โดยไม่ต้องทดลองซ้ำ
- `git rev-parse --abbrev-ref --symbolic-full-name @{upstream}` = `origin/main` (มี upstream)
- `bunx tsc --noEmit` ผ่านสะอาด (baseline)
- `.gitignore` มี `*.tsbuildinfo` และ `dist` แล้ว
- ไม่มี snapshot สักไฟล์ (`toMatchSnapshot` 0 แห่ง · ไม่มี `__snapshots__/`) และ vitest ไม่ได้
  เปิด coverage ⇒ **gate ทั้งสามไม่เขียนไฟล์ที่ git ติดตาม** ซึ่งเป็นเงื่อนไขจำเป็น: gate
  ที่ทำ tree สกปรกจะทำให้ `bun pm version` พังที่ขั้นสุดท้ายด้วย
  "Git working directory not clean" หลังจากผู้ใช้ตอบ prompt ไปแล้ว
- ไม่มีเทสต์ไหน render `StatusBar` (`root-layout.tsx` เป็นผู้ใช้เดียว)
- มี `types/global.d.ts` อยู่แล้ว (ตอนนี้มีแค่ `declare module "*.css" {}`)
- `vitest.config.ts` แยกไฟล์จาก `vite.config.ts` — ต้องเติม `define` ทั้งสองที่

### พฤติกรรม `bun pm version` ที่ design นี้พึ่งพา (จาก spec god-mode)

- rewrite `package.json` โดยรักษา format เดิม, สร้าง commit, สร้าง **annotated** tag
- ปฏิเสธการทำงานถ้า tree ไม่สะอาด, แตะเฉพาะ `package.json` ใน release commit
- `%s` แทนที่ด้วยเลขเวอร์ชันเปล่า **ไม่มี `v` นำหน้า** ⇒ ต้องเขียน `v` เองใน `-m`
- **commit ก่อน tag ทีหลัง** — ถ้า tag ชนจะ exit 1 หลังจาก commit ไปแล้ว เหลือ release
  commit ที่ไม่มี tag นี่คือเหตุผลที่ต้องเช็ค tag ล่วงหน้า ไม่ปล่อยให้ `git tag` ปฏิเสธเอง

### การตัดสินใจที่เก็บได้จาก brainstorming

- **ขอบเขต bump:** `package.json` + สิ่งที่ footer แสดง ไม่รวม `changelog.json`
  (ต้องมี generator ซึ่งเป็นงานคนละชิ้น)
- **วิธีให้ footer ตามทัน:** ฉีดค่าตอน build ผ่าน vite `define` — **ไม่ใช่**ให้ bump script
  เขียน literal ลง `lib/version.ts` เหตุผล: การเขียนไฟล์ที่สองเข้า release commit เดียวกัน
  ต้องเลิกใช้ git ops ของ `bun pm version` (`--no-git-tag-version`) แล้ว hand-roll
  commit + annotated tag เอง (~25 บรรทัดเพิ่ม) และยังเหลือ source ที่ต้อง sync สองที่อยู่ดี
  ทางที่เลือกทำให้ drift **เกิดไม่ได้เชิงโครงสร้าง** และ `scripts/bump.ts` ยังเป็น port
  ตรงตัวของ god-mode
- **ไม่เก็บ `-build.<date>.<sha>`:** suffix นี้ไม่มีที่ไหนแสดงผล และมีปัญหาไก่กับไข่ —
  sha ของ release commit รู้ได้ก็ต่อเมื่อ commit ไปแล้ว ค่าเดิม `dbf5ae2b` จึงเป็นของ
  commit ก่อนหน้าเสมอ YAGNI จนกว่าจะมีคนต้องการระบุ build จริง ๆ
- **เวอร์ชันตั้งต้น:** จัดแนว `package.json` เป็น `1.0.1` ให้ตรงกับสิ่งที่ผู้ใช้เห็นอยู่
  ทางเลือกที่ปฏิเสธ: ปล่อย `0.1.0` (footer จะถอย `1.0.1 → 0.1.1` ดูเหมือน downgrade) และ
  ขึ้น `2.0.0` เพราะ SPA port เป็นของใหม่ (สื่อสารชัดกว่าแต่ตัดขาดจากเลขเดิม)
- **gate:** `typecheck` + `lint` + `test:run` เทสต์ที่นี่เป็น vitest + jsdom ล้วน ไม่พึ่ง DB
  ต่างจาก god-mode ที่ตัดเทสต์ออกเพราะ integration test ปลุก embedded-postgres
- **git scope:** หยุดที่ commit + tag local ไม่ push ไม่ `gh release create` — ความผิดพลาด
  local แก้ด้วย `git reset` + `git tag -d` แต่ที่ push แล้วคือสาธารณะ อีกอย่าง `main`
  ถูก protect การ push อัตโนมัติก็จะโดนปฏิเสธอยู่ดี
- **branch guard:** `main` เท่านั้น release tag อยู่บน production branch รันที่อื่นให้ abort

## Design

### ส่วนที่ 1 — ท่อส่งเวอร์ชัน

`package.json` เป็นแหล่งความจริงแหล่งเดียว ที่เหลืออ่านต่อจากมัน ไม่มีใครถือสำเนา

```
package.json.version ──(อ่านตอน build)──> define __APP_VERSION__ ──> lib/version.ts ──> status-bar
                        vite.config.ts / vitest.config.ts
```

| ไฟล์ | การเปลี่ยน |
| --- | --- |
| `scripts/app-version.ts` | **ใหม่** — `appVersion(): string` อ่าน `package.json` แล้ว throw ถ้าไม่มีฟิลด์ `version` |
| `vite.config.ts` | เพิ่ม `define: { __APP_VERSION__: JSON.stringify(appVersion()) }` |
| `vitest.config.ts` | เพิ่ม `define` ตัวเดียวกัน |
| `types/global.d.ts` | เพิ่ม `declare const __APP_VERSION__: string;` |
| `lib/version.ts` | จาก literal ค้าง → `export const APP_VERSION = __APP_VERSION__;` |
| `components/footer/status-bar.tsx` | ลบ `.split("-")[0]` + แก้ JSDoc ที่บอกว่าเวอร์ชันอ่านจาก `lib/version.ts` |

`appVersion()` แยกเป็นไฟล์ของตัวเองแทนที่จะ copy ลงสอง config เพราะสำเนาสองชุดที่ต้อง
sync กันเองคือปัญหาที่ design นี้กำลังแก้อยู่พอดี — จะแก้ด้วยการสร้างมันขึ้นใหม่ไม่ได้
ไฟล์นี้ทำหน้าที่เดียว ไม่มี side effect และ import ได้จากทั้งสอง config

`vitest.config.ts` **ต้อง** มี `define` ด้วย ไม่งั้นเทสต์ใดก็ตามที่ import
`lib/version.ts` จะพังด้วย `ReferenceError: __APP_VERSION__ is not defined` — วันนี้ยังไม่มี
เทสต์แบบนั้น แต่กับดักที่รอเทสต์ตัวถัดไปไม่ใช่สิ่งที่ควรทิ้งไว้

**ไม่แตะ:** `changelog.json` · `lib/changelog.ts` · `hooks/use-whats-new.ts` ·
`components/footer/whats-new-dialog.tsx` — `useWhatsNew` เทียบ last-seen กับ
`CHANGELOG.current` ซึ่งเป็นคนละค่ากับ `APP_VERSION` ดังนั้นหลัง bump แล้ว dialog
**จะไม่เด้ง** เพราะไม่มีรายการเปลี่ยนแปลงใหม่ให้อ่านจริง นั่นคือพฤติกรรมที่ถูกต้อง —
dialog ที่เด้งมาแล้วว่างเปล่าแย่กว่าไม่เด้ง

### ส่วนที่ 2 — `scripts/bump.ts`

| ไฟล์ | การเปลี่ยน |
| --- | --- |
| `scripts/bump.ts` | **ใหม่** — port จาก `../carmen-inventory-god-mode/scripts/bump.ts` ทั้งไฟล์ |
| `package.json` | เพิ่ม `"typecheck": "tsc --noEmit"` · `"build:bump": "bun scripts/bump.ts"` · ตั้ง `version` = `1.0.1` |

`build` เดิม (`tsc --noEmit && vite build`) **ไม่แตะ** — CI เรียกมันอยู่ ปล่อยให้
`tsc --noEmit` ซ้ำสองที่ ดีกว่าเสี่ยงกับ pipeline เพื่อ dedup หนึ่งบรรทัด

หน่วยที่ยกมาทั้งดุ้นพร้อมคอมเมนต์อธิบายเหตุผล: `fail` · `git` · `tryGit` ·
`nextVersions` · `readVersion` · `parseLevelArg` · `promptLevel` ·
`assertBranchAndTree` · `assertUpToDate` · `assertTagFree` · `gate` · `main`

หน้าที่ของแต่ละหน่วย (ไม่แก้ตรรกะจากต้นฉบับ):

- **`nextVersions(current)`** — pure parse `MAJOR.MINOR.PATCH` คืนสามผู้สมัคร ไม่มี IO
  เป็นชิ้นเดียวที่มีตรรกะจริงและเป็นชิ้นเดียวที่คุ้มจะเขียนเทสต์
- **`assertBranchAndTree()`** — branch ต้องเป็น `main` และ tree สะอาด
- **`assertUpToDate()`** — resolve upstream ผ่าน `tryGit` (ตัวแปรของ `git()` ที่คืน `null`
  แทน exit เพราะ "ไม่มี upstream" เป็นผลลัพธ์ปกติ ไม่ใช่ error) ไม่มี upstream = ข้าม
  และพิมพ์บอก มี upstream = `git rev-list --count HEAD..@{upstream}` ต้องเป็น 0
  ใช้เฉพาะ remote-tracking ref ที่ fetch ไว้แล้ว **ไม่ยิง `git fetch`** อยู่*หน้า* upstream
  ถือว่าปกติ ไม่ abort
- **`assertTagFree(version)`** — abort ถ้ามี `v<version>` แล้ว เช็คเฉพาะเวอร์ชัน**ที่เลือก**
  เท่านั้น: `v1.0.2` ที่มีอยู่ต้องไม่ขวาง minor bump ไป `v1.1.0`
- **`promptLevel(current, candidates)`** — **iterate readline** (`for await (const line of rl)`)
  ไม่ใช่ `rl.question()` ต่อรอบ: กับ stdin ที่ pipe เข้ามา readline จะ buffer ทุกบรรทัดพร้อมกัน
  และบรรทัดที่ปล่อยออกมาตอนไม่มี `question()` ค้างอยู่จะถูกทิ้งเงียบ ๆ ⇒ ลำดับ
  "input ผิด → ลองใหม่" จะสูญบรรทัดที่สอง แล้ว script จบโดยไม่ bump การ iterate ยังทำให้
  EOF เป็นจุดจบตามธรรมชาติของลูป ไม่ต้องมี `close` handler
- **`gate(script, done)`** — `bun run --silent <script>` ส่ง output ผ่านไปตรง ๆ ไม่กลืน
  ถ้าล้มเหลว exit ด้วยรหัสของมัน

**Runtime API:** `node:child_process` · `node:fs` · `node:readline` — ไม่ใช่ `Bun.*` global
`tsconfig.json` include `**/*.ts` ⇒ `scripts/bump.ts` และ `scripts/app-version.ts` ถูก
typecheck ด้วย `tsc --noEmit` และ repo นี้ไม่ได้ติดตั้ง `bun-types` / `@types/bun`
(`vite.config.ts` ที่มีอยู่ก็ใช้ `node:fs` / `node:path` แบบเดียวกัน) ไม่มี dependency ใหม่

**จุดเดียวที่ต่างจาก god-mode:**

```
gate("typecheck", "▸ typecheck ........ ✓")
gate("lint",      "▸ lint ............. ✓")
gate("test:run",  "▸ tests ............ ✓")     ← เพิ่มมา
```

### ลำดับการทำงาน

```
1.  อ่าน version จาก package.json + nextVersions()
2.  assertBranchAndTree()            ทันที — ล้มก่อนที่ผู้ใช้จะเสียเวลา
3.  assertUpToDate()                 ทันที — ใช้ ref ที่ fetch ไว้แล้ว ไม่ยิง git fetch
4.  promptLevel()  (หรือ arg)        ตอบได้ทันที ไม่ต้องรอ
5.  assertTagFree(target)            ทันที
6.  bun run --silent typecheck
7.  bun run --silent lint
8.  bun run --silent test:run
9.  bun pm version <level> -m "chore(release): v%s"
10. ยืนยัน git tag --list v<target> ไม่ว่าง
11. พิมพ์คำสั่ง push เป็นขั้นถัดไป
```

ของแพงอยู่**หลัง** prompt โดยตั้งใจ: ผู้ใช้ไม่ถูกบังคับให้รอก่อนถูกถาม และเพราะไม่มีอะไร
ถูกเขียนลงดิสก์จนถึงข้อ 9 การล้มที่ข้อ 6-8 จึงเสียแค่คำตอบ ไม่ใช่ release ที่ทำค้างไว้ครึ่งทาง

commit message `chore(release): v1.0.2` คงภาษาอังกฤษไว้ ไม่ขัดกับกฎ "commit เป็นไทย" ของ
repo เพราะไม่มีข้อความบรรยาย มีแค่ conventional type กับเลขเวอร์ชัน

### Terminal output

```
$ bun run build:bump
▸ branch ........... main ✓
▸ working tree ..... clean ✓
▸ upstream ......... up to date (origin/main) ✓

  current: 1.0.1
  ? เลือกระดับ bump
    1) patch  → 1.0.2
    2) minor  → 1.1.0
    3) major  → 2.0.0
    q) ยกเลิก (หรือกด Enter)
  > 1

▸ typecheck ........ ✓
▸ lint ............. ✓
▸ tests ............ ✓
✓ v1.0.2
  commit  chore(release): v1.0.2
  tag     v1.0.2 (annotated)

→ ขั้นต่อไป: git push origin main && git push origin v1.0.2
```

ถ้าไม่มี upstream บรรทัดนั้นจะเป็น `▸ upstream ......... skip (ไม่มี upstream) ✓`
และไม่บังคับใช้

### รูปแบบ non-interactive

```
bun run build:bump patch
bun run build:bump minor
bun run build:bump major
```

ส่ง level เป็น argument จะข้ามข้อ 4 แต่ guard และ gate ทุกตัวยังรันครบ มีไว้เพื่อให้
ทดสอบได้โดยไม่ต้องมี TTY — จำเป็นสำหรับการ verify และสำหรับ CI ในอนาคต

### การจัดแนวเวอร์ชันตั้งต้น

commit แยกใน branch เดียวกัน: `package.json` `0.1.0 → 1.0.1` **ไม่สร้าง tag `v1.0.1`** —
เวอร์ชันนั้นถูกปล่อยตั้งแต่ 2026-05-27 บนแอปเดิม ไม่มี commit ไหนใน repo นี้ที่ตรงกับมัน
การแปะ tag ย้อนหลังบน HEAD วันนี้คือการโกหกประวัติ tag แรกจริงจะเป็น `v1.0.2` (หรือ
`v1.1.0`) จาก bump ครั้งแรก

### Error handling

guard ทุกตัวล้มด้วยรหัสไม่เป็นศูนย์ **ก่อน**ที่จะมีอะไรถูกเขียน ข้อยกเว้นเดียวคือ
`bun pm version` เอง ซึ่ง rewrite และ stage `package.json` ก่อน commit

| เงื่อนไข | พฤติกรรม |
| --- | --- |
| ไม่ได้อยู่บน `main` | `✗ build:bump ต้องรันบน main (ตอนนี้อยู่ <branch>)`, exit 1 |
| tree ไม่สะอาด | พิมพ์ `git status --porcelain`, exit 1 |
| local ตามหลัง upstream | `✗ local อยู่หลัง <upstream> <n> commit — git pull ก่อนรันซ้ำ`, exit 1 · ข้าม (ไม่ใช่ error) เมื่อไม่มี upstream · ไม่ยิง `git fetch` |
| tag ของเวอร์ชันที่เลือกมีอยู่แล้ว | `✗ tag v1.0.2 มีอยู่แล้ว`, exit 1 |
| `typecheck` / `lint` / `test:run` ตก | ส่ง output ดิบของเครื่องมือออกไป, exit ด้วยรหัสของมัน |
| argument level ผิด | `✗ ระดับต้องเป็น patch\|minor\|major`, exit 1 |
| เวอร์ชันปัจจุบัน parse ไม่ได้ | `✗ อ่านเวอร์ชันจาก package.json ไม่ได้: <value>`, exit 1 |
| กด `q` หรือ EOF ที่ prompt | exit 0 ไม่ทำอะไร |
| `bun pm version` ล้ม (เช่น pre-commit hook ปฏิเสธ) | `package.json` เหลือ **ถูก bump และ stage ไว้** ข้อความบอกจุดนี้ ชี้ไป `git status` และให้คำสั่งกู้: `git restore --staged --worktree package.json` · exit ด้วยรหัสของ `bun pm version` |
| `bun pm version` สำเร็จ แต่ `git tag --list v<target>` ว่าง | `✗ bun pm version รันจบแล้วแต่ไม่พบ tag v<target> — ตรวจ git log และ git tag`, exit 1 — กันกรณีเลขที่ `nextVersions()` คำนวณเองไม่ตรงกับที่ `bun pm version` tag จริง |

`appVersion()` throw ถ้า `package.json` ไม่มีฟิลด์ `version` ⇒ `vite build` และ `vitest`
ล้มทันทีพร้อมข้อความชัด แทนที่จะฉีด `undefined` เข้า bundle เงียบ ๆ

### นอกขอบเขต

- push, `gh release create`, generate `changelog.json`
- แสดง build sha / วันที่ ที่ไหนก็ตามใน UI
- แตะ What's New dialog หรือ `hooks/use-whats-new.ts`
- prerelease / `--preid` — เรียก `bun pm version prerelease --preid beta` ตรง ๆ ได้ถ้าต้องการ

## Verification

1. `bunx tsc --noEmit` · `bun run lint` · `bun test:run` เขียวทั้งหมด
2. `bun dev` แล้วดู footer — ต้องขึ้น `v1.0.1` ไม่มี suffix (ยืนยัน define ทำงานใน dev)
3. `bun run build` แล้ว grep หา `1.0.1` ใน `dist/assets/*.js` — ยืนยันว่าฉีดเข้า bundle จริง
4. รัน path non-interactive (`bun run build:bump patch`) ใน **git repo ทิ้งใต้ scratchpad**
   ตรวจ commit message, annotated tag (`git cat-file -t v<x>` = `tag`) และ `package.json`
   ที่ถูกเขียน — repo จริงจะไม่ถูก tag จนกว่าผู้ใช้จะสั่ง
5. ยิงทีละ guard ด้วยมือ: รันบน branch ที่ไม่ใช่ `main` · tree สกปรก · tag ปลายทางมีอยู่แล้ว

ตาม preference ประจำของผู้ใช้ จะไม่เขียน `*.test.ts` เว้นแต่ถูกสั่งในเทิร์นเดียวกัน —
`nextVersions()` ยังคงเป็น pure function จึงเติมเทสต์ทีหลังได้โดยไม่ต้องรื้อโครงสร้าง
