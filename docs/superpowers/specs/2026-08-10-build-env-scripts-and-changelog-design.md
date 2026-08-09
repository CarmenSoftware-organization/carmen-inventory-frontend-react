# build:{env} + build:bump ที่เขียน changelog เอง

Date: 2026-08-10
Branch base: main (v1.2.0 · `0f6ec40`)

## Goal

สองเรื่องที่ทำพร้อมกันเพราะแตะ `package.json` ชุดสคริปต์เดียวกัน:

1. เพิ่ม `bun run build:{local,dev,uat,prod}` — เลือก backend ตอน build ได้ตรง ๆ
   แทนการพึ่ง default ที่ซ่อนอยู่ใน `vite.config.ts`
2. ทำให้ `bun run build:bump` generate `changelog.json` + `CHANGELOG.md`
   เหมือน `build:bump` ของ `carmen-turborepo-backend-v2` — ปิด known open item
   ที่ค้างอยู่ท้าย `CLAUDE.md`

## Background

### เรื่องที่ 1 — `build` ใช้ config.prod.json อยู่แล้ว แต่ไม่มีใครรู้

`vite.config.ts:49` ตั้ง `BUILD_CONFIG_FILE ?? "config.prod.json"` เป็น default
ดังนั้น `bun run build` เปล่า ๆ ก็ emit `dist/config.json` จาก prod อยู่แล้ว
อ่าน `package.json` แล้วเดาไม่ออก และไม่มีทางเลือก env อื่นนอกจากตั้ง env var เอง
ขณะที่ฝั่ง dev มี `dev:{local,dev,uat,prod}` ครบมาตั้งแต่ 2026-07-16 แล้ว
(`docs/superpowers/specs/2026-07-16-dev-env-scripts-design.md`)

ผู้ใช้ `BUILD_CONFIG_FILE` วันนี้:

| จุด | ค่า | เหตุผล |
| --- | --- | --- |
| `ci.yml:40` | `config.sample.json` | `config.prod.json` ถูก gitignore ไม่มีบน runner |
| `deploy-gcp.yml:47` | `config.sample.json` | เหมือนกัน · config จริงเขียนทับทีหลังจาก repo variables |
| `deploy-s3.sh:10` · `deploy-gcs.sh:12` | ไม่ตั้ง (= prod) | แต่ตัด `dist/config.json` ออกจาก sync — ของจริงอยู่บน bucket |
| `Dockerfile:19` | ไม่ตั้ง (= prod) | แล้ว `rm -f dist/config*.json` — render จาก env ตอนรัน |

**ขอบเขตที่ต้องเข้าใจตรงกัน:** `dist/config.json` มีผลจริงแค่ `bun run preview`
กับ Vercel เท่านั้น เส้นทาง S3 / GCS / Docker ทิ้งมันทั้งหมดตามโมเดล
"one immutable build artifact" ใน `docs/deploy.md:3-5` — `build:{env}` จึงเป็น
เครื่องมือสำหรับ preview + ความชัดเจน ไม่ใช่การเปลี่ยนวิธี deploy

### เรื่องที่ 2 — `changelog.json` เป็นของรีโปอื่น และไม่มีใคร generate

`CLAUDE.md` เขียนไว้เองว่า:

> After the first `build:bump`, the footer's version and `changelog.json`'s newest
> entry diverge — nothing regenerates `changelog.json` … the fix is a changelog
> generator (separate work).

สภาพจริงหนักกว่านั้น (ยืนยัน 2026-08-10):

| ข้อเท็จจริง | หลักฐาน |
| --- | --- |
| `changelog.json` `current` = `1.0.1` ขณะ `package.json` = `1.2.0` | ห่างกัน 2 minor |
| `generated_at` = `2026-05-27` ก่อน commit แรกของรีโปนี้ (`6dd0633`, 2026-06-11) | ไฟล์ถูก copy ติดมาตอน port จาก Next.js app |
| baseline commit `dbf5ae2b` **ไม่มีอยู่ในรีโปนี้** | `git cat-file -t dbf5ae2b` → `Not a valid object name` |

ข้อสุดท้ายสำคัญ: ถ้า port `recordRelease()` ของ backend มาแล้วรันทันที มันจะเรียก
`git log dbf5ae2b..HEAD` แล้ว fatal ตั้งแต่ครั้งแรก — ต้อง bootstrap ก่อนเสมอ

### สิ่งที่ backend มีแต่รีโปนี้ไม่มี

| ขั้นตอน | backend (`scripts/bump/`) | repo นี้ (`scripts/bump.ts`) |
| --- | --- | --- |
| gates | `check-types` + scoped lint | `typecheck` + `lint` + `test:run` ✓ |
| เขียนเวอร์ชันลง package.json | `writePackageVersion()` เขียนเอง | `bun pm version` ✓ |
| propagate ไปไฟล์เวอร์ชันอื่น | `apps/backend-gateway/src/version.ts` | **ไม่ต้อง** — `__APP_VERSION__` อ่านจาก package.json ผ่าน `scripts/app-version.ts` แล้ว |
| generate `changelog.json` | `recordRelease()` | ✗ **ช่องว่างตัวจริง** |
| generate `CHANGELOG.md` | `renderMarkdown()` | ✗ ไฟล์ยังไม่มี |
| commit เฉพาะไฟล์ที่ระบุ | `RELEASE_FILES` 5 ไฟล์ | `bun pm version` commit ให้เอง (package.json เท่านั้น) |
| annotated tag | `git tag -a` | ✓ |

`bun pm version` คือกำแพง: มัน commit + tag ให้เองและ commit ได้แค่ `package.json`
ทันทีที่ต้อง commit ไฟล์ที่สอง (`changelog.json`) ก็ใช้มันต่อไม่ได้ — เหตุผลเดียว
กับที่ backend เลิกใช้มันไปเขียน git เอง

## Design

### 1. `package.json` — เพิ่ม 4 บรรทัด

```json
"build": "tsc --noEmit && vite build",
"build:local": "BUILD_CONFIG_FILE=config.local.json bun run build",
"build:dev":   "BUILD_CONFIG_FILE=config.dev.json bun run build",
"build:uat":   "BUILD_CONFIG_FILE=config.uat.json bun run build",
"build:prod":  "BUILD_CONFIG_FILE=config.prod.json bun run build",
"build:bump":  "bun scripts/bump.ts",
```

- `build` **ไม่แตะ** — ยัง default เป็น `config.prod.json` ดังนั้น `deploy-s3.sh`,
  `deploy-gcs.sh`, `Dockerfile`, `ci.yml`, `deploy-gcp.yml` ไม่ต้องแก้แม้แต่บรรทัดเดียว
  และ `BUILD_CONFIG_FILE` ที่ CI ส่งเข้ามายังชนะเหมือนเดิม
- **ห้ามเขียน `"build": "bun run build:prod"`** — inline env var ใน `build:prod`
  จะทับค่าที่ CI ส่งมา ทำให้ CI หา `config.prod.json` (gitignore) ไม่เจอแล้วพัง
- รูปแบบ `VAR=x bun run …` ล้อ `dev:*` ที่มีอยู่แล้ว (`CONFIG_ENV=local vite`)
  ไม่เพิ่มแนวคิดใหม่ · ไม่ทำงานบน Windows cmd เหมือน `dev:*` ซึ่งยอมรับมาแล้ว
- ทุกตัวสืบทอด `tsc --noEmit` มาจาก `build` อัตโนมัติ
- `vite.config.ts` ไม่ต้องแก้ — `emitBuildConfig()` อ่าน env var นี้อยู่แล้ว

### 2. ไฟล์ใหม่ `scripts/changelog.ts`

Port จาก `carmen-turborepo-backend-v2/apps/backend-gateway/scripts/generate-changelog.ts`
โครงสร้างข้อมูลเหมือนกันเป๊ะอยู่แล้ว (`lib/changelog.ts:4-31` = interface ชุดเดียวกับ backend)

**Exports**

| ฟังก์ชัน | หน้าที่ |
| --- | --- |
| `recordRelease({ target, fullVersion })` | แทรก entry ใหม่บนสุดของ `changelog.json` + เขียน `CHANGELOG.md` ใหม่ทั้งไฟล์ |
| `renderMarkdown(changelog)` | สร้างข้อความ `CHANGELOG.md` จาก object |
| `rebuildFromTags()` | bootstrap — สร้าง `changelog.json` ใหม่จาก git tag (ข้อ 4) |

**รันตรง ๆ**

- `bun scripts/changelog.ts` — re-render `CHANGELOG.md` จาก `changelog.json` ปัจจุบัน
- `bun scripts/changelog.ts --rebuild` — เรียก `rebuildFromTags()`

ไม่เพิ่ม entry ใน `package.json` สำหรับสองคำสั่งนี้ — ตัวแรกใช้เมื่อแก้ json ด้วยมือ
ตัวหลังรันครั้งเดียวตลอดอายุรีโป เขียนไว้ใน `CLAUDE.md` พอ

**ดัดแปลง 3 จุด — ห้ามลอกตรง ๆ**

**(ก) merge ที่ไม่มีเลข PR ต้องไม่ถูกข้าม** — กับดักใหญ่สุด
backend เขียน `if (merge.pr === null) continue;` ใน `collectCommits()` เพราะที่นั่น
ทุก merge มาจาก GitHub PR แต่รีโปนี้:

| ประเภท merge บน first-parent | จำนวน |
| --- | --- |
| `Merge pull request #N …` (GitHub) | 75 |
| `merge: <ข้อความไทย>` (merge branch ในเครื่อง) | 33 |
| **รวม** | **108** |

ลอกมาตรง ๆ = commit ทุกตัวใน 33 สาขานั้นหายจาก changelog เงียบ ๆ
→ ต้องเดิน `merge^1..merge^2` **ทุก merge** แล้วตั้ง `pr: null` เมื่อ regex
`/Merge pull request #(\d+)/` ไม่แมตช์

**(ข) ไม่ประกาศ interface ซ้ำ** — `import type { Changelog, VersionEntry, ChangeItem }
from "../lib/changelog"` (type-only จึงถูก erase ทิ้ง ไม่ลาก `changelog.json` เข้าสคริปต์)
`tsconfig.json` มีชุดเดียว `include: ["**/*.ts"]` ครอบ `scripts/` อยู่แล้ว
`bun run typecheck` จึงตรวจให้ทันที เหตุผลเดียวกับที่ `scripts/app-version.ts`
ถูกแยกออกมา — "สำเนาสองชุดที่ต้อง sync กันเองคือปัญหาที่ทั้งหมดนี้กำลังแก้อยู่พอดี"

**(ค) ไม่ต้องมีไฟล์เวอร์ชันเพิ่ม** — backend เขียน `fullVersion` ลง `src/version.ts`
ที่นี่ `__APP_VERSION__` มาจาก `package.json` ผ่าน `scripts/app-version.ts` อยู่แล้ว
`fullVersion` (`1.2.1-build.20260810.abc1234`) จึงใช้เป็นแค่ฟิลด์ `build` ใน
`changelog.json` ซึ่ง `whats-new-dialog.tsx:98` ใช้เป็น React key (ต้อง unique)

**เกณฑ์จัดหมวด (ยกมาทั้งชุด)** — `feat`→`added` · `fix`→`fixed` ·
`perf`/`refactor`→`changed` · type อื่นถูกทิ้ง · `chore: bump … version` ถูกกรองซ้ำ
ตรวจกับช่วงจริง `v1.1.0..v1.2.0`: 80 commit ไม่ใช่ merge → เข้าเกณฑ์ 57 รายการ

### 3. `scripts/bump.ts` — เลิกใช้ `bun pm version`

ลำดับใหม่ (gates เดิมไม่แตะ):

```
assertBranchAndTree() · assertUpToDate() · parseLevelArg()/promptLevel() · assertTagFree()
  ↓
gate("typecheck") · gate("lint") · gate("test:run")        ← เดิมทั้งหมด
  ↓
writePackageVersion("package.json", target)
recordRelease({ target, fullVersion })    → changelog.json + CHANGELOG.md
  ↓
git add package.json changelog.json CHANGELOG.md           ← RELEASE_FILES ระบุชัด
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m vX.Y.Z
```

- `fullVersion` คำนวณใน `bump.ts` ก่อนเรียก `recordRelease()`:
  `${target}-build.${YYYYMMDD}.${git rev-parse --short HEAD}` — hash ตรงนี้คือ HEAD
  **ก่อน** release commit เพราะ changelog ต้องถูกเขียนก่อนจึงจะ commit ได้
  ฟิลด์ `commit` ของ entry ใช้ hash เดียวกันนี้
- **ผลที่ตามมาที่ตั้งใจ:** release ถัดไปจะได้ช่วง `<hash ก่อน release ที่แล้ว>..HEAD`
  ซึ่งกิน commit `chore(release): vX` ของรอบก่อนเข้ามาด้วย 1 ตัว — ไม่เป็นไร เพราะ
  `chore` ไม่เข้าเกณฑ์หมวดใดเลยและถูกทิ้งอยู่แล้ว (พฤติกรรมเดียวกับ backend)
  ต่างจาก entry ที่ได้จาก `--rebuild` ซึ่ง `commit` ชี้ที่ release commit พอดี
  จึงไม่คาบเกี่ยว — ความต่างนี้ตั้งใจ ไม่ต้องไปทำให้เท่ากัน
- `RELEASE_FILES` ระบุ path ตรง ๆ เพื่อไม่ให้ไฟล์แปลกปลอมที่โผล่มาระหว่าง guard
  กับ commit ติดเข้า release ไปด้วย (เหตุผลเดียวกับ backend)
- **ข้อความกู้คืนต้องแยกตามหน้าต่างที่พัง** — ก่อน commit สำเร็จ:
  `git restore --staged --worktree package.json changelog.json CHANGELOG.md` ·
  หลัง commit แต่ tag ไม่สำเร็จ: ไปต่อด้วย `git tag -a vX -m vX` หรือถอยด้วย
  `git reset --hard HEAD~1`
- คอมเมนต์เดิมที่ `bump.ts:167-173` (gate ห้ามเขียนไฟล์ tracked) **ยังใช้ได้และต้องคงไว้** —
  เหตุผลเปลี่ยนเล็กน้อย: เดิมเพราะ `bun pm version` ต้องการ tree สะอาด ตอนนี้เพราะ
  `git add` ระบุ path ชัดเจนแล้ว ไฟล์ที่ gate เผลอเขียนจะกลายเป็น dirty tree ค้าง
  หลัง release แทนที่จะพังตรง ๆ
- `writePackageVersion()` ตรวจรูปแบบ `MAJOR.MINOR.PATCH` ก่อนเขียน — กัน
  `JSON.stringify` ทิ้งคีย์ `version` เงียบ ๆ ถ้าค่าไม่ใช่ string (ยกมาจาก backend)
- JSON round-trip ของ `package.json` ต้องได้ไฟล์เหมือนเดิมทุก byte ยกเว้นค่า version
  (`JSON.stringify(pkg, null, 2) + "\n"`) — ยืนยันตอน implement ด้วย `git diff`

### 4. Bootstrap ครั้งเดียว — `bun scripts/changelog.ts --rebuild`

ทิ้ง `changelog.json` ของรีโปเก่าทั้งไฟล์ สร้างใหม่จาก tag ที่มีจริง
(`git tag --list "v*" --sort=v:refname` → `v1.1.0`, `v1.2.0`):

| entry | ช่วง git | `date` | `commit` |
| --- | --- | --- | --- |
| `1.2.0` | `v1.1.0..v1.2.0` | วันที่ของ commit ที่ tag ชี้ (2026-08-09) | `0f6ec40` |
| `1.1.0` | `v1.1.0` (ทั้งประวัติถึง tag นั้น) · `note: "init"` | 2026-08-05 | `3221799` |

- `current: "1.2.0"` = `package.json` → **ปิด known open item**
- `date` ต้องเป็นวันที่ของ commit ที่ tag ชี้ ไม่ใช่วันนี้
- `commit` ของแต่ละ entry = commit ที่ tag ชี้ (คือ release commit) ทำให้ช่วงของ
  `recordRelease()` ครั้งถัดไปเป็น `0f6ec40..HEAD` พอดี ไม่คาบเกี่ยว
- `note: "init"` บน entry เก่าสุดเพื่อความเข้ากันกับ backend — `whats-new-dialog.tsx:50`
  แสดง "Initial release." เฉพาะเมื่อ entry นั้นไม่มีรายการเลย ซึ่งจะไม่เกิดที่นี่
- เวอร์ชัน 1.0.x หายไปจากประวัติเพราะไม่มี tag ให้อ้าง — ยอมรับได้ ไม่มีใครเคยเห็น
  entry เหล่านั้นในแอปอยู่แล้ว (dialog อ่านจาก `changelog.json` ที่ค้างที่ 1.0.1)
- `lib/__tests__/changelog.test.ts:3` mock `@/changelog.json` ทั้งก้อน → rebuild
  ไม่กระทบเทสต์

### 5. เอกสาร

- `CLAUDE.md` Commands — เพิ่ม `build:{local,dev,uat,prod}` พร้อมโน้ตว่ามีผลกับ
  `dist/config.json` (preview/Vercel) เท่านั้น · แก้คำอธิบาย `build:bump` ว่าเขียน
  `changelog.json` + `CHANGELOG.md` ด้วย · **ลบ** bullet สุดท้ายของ Known open items
- `docs/deploy.md` — โน้ตสั้น ๆ ว่า `build:{env}` ไม่กระทบเส้นทาง S3/GCS/Docker

## Verification

ไม่เขียนเทสต์อัตโนมัติใหม่ (ล้อ `2026-07-16-dev-env-scripts-design.md` ที่ไม่มีเทสต์
สำหรับ Vite plugin) — ตรวจด้วยมือตามนี้

**build:{env}**

1. `bun run build:uat` → `dist/config.json` ต้องตรงกับ `public/config.uat.json`
2. `bun run build` เปล่า ๆ → ยังได้ `config.prod.json` เหมือนเดิม
3. `BUILD_CONFIG_FILE=config.sample.json bun run build` (จำลอง CI) → ต้องได้ sample
   ไม่ใช่ prod
4. `bun run build:local && bun run preview` → แอปเรียก `localhost:4000`

**changelog + bump**

5. `bun scripts/changelog.ts --rebuild` → เทียบจำนวนรายการของ entry `1.2.0`
   กับ `git log v1.1.0..v1.2.0` ด้วยมือ · ตรวจว่ามี commit จากสาขาที่ merge แบบ
   `merge:` (ไม่มีเลข PR) ติดมาด้วยจริง — นี่คือจุดที่การลอกตรง ๆ จะพลาด
6. `bun scripts/changelog.ts` → `CHANGELOG.md` render ได้ ไม่พัง
7. `bun run typecheck && bun run lint && bun test:run` เขียวทั้งหมด
8. What's New dialog ในเบราว์เซอร์ — หัวข้อเวอร์ชันต้องตรงกับปุ่ม footer ที่กดเปิด
9. **`build:bump` ทดสอบยาก** — `assertBranchAndTree()` บังคับอยู่บน `main` และมัน
   สร้าง commit + tag จริง วิธีตรวจ: รันบน `main` จริงแล้วถอยก่อน push ด้วย
   `git reset --hard HEAD~1 && git tag -d vX.Y.Z` · ตรวจก่อนถอยว่า commit มี
   3 ไฟล์ครบและ tag เป็น annotated (`git cat-file -t vX.Y.Z` = `tag`)

## Out of scope

- เปลี่ยนวิธี deploy — S3/GCS/Docker/Vercel ยังเหมือนเดิมทุกประการ
- เติม backend prod จริงลง `config.prod.json` (ยังชี้ dev.blueledgers.com ตามเดิม)
- push commit/tag อัตโนมัติ — `build:bump` ยังเป็น local อย่างเดียว
- ย้อนสร้าง entry ของเวอร์ชัน 1.0.x ที่ไม่มี tag
- เปลี่ยนชื่อ `build:bump` ให้หลุดจาก namespace `build:*` (เคยพิจารณา ตัดสินให้คงชื่อเดิม)
