# CLAUDE.md

CARMEN BLUE frontend — **Vite + React Router SPA port** of the Next.js app at
`../carmen-inventory-frontend/`. Static bundle on S3/CloudFront; the browser calls the
backend directly. Spec: `docs/superpowers/specs/2026-06-11-carmen-react-ssg-migration-design.md`.

## ภาษาในการสื่อสาร

สื่อสารกับ user เป็น **ภาษาไทย** เสมอ — รวมถึง commit message (เขียนเป็นภาษาไทย)
ยกเว้น code / identifier และ **PR ที่ยังใช้ภาษาอังกฤษ**

## Commands

```bash
bun dev              # Dev server = dev:local (VITE_DEV_PROXY_TARGET=<backend> to proxy /api)
bun run dev:{local,dev,uat,prod}   # Dev server per backend env → public/config.<env>.json (prod = dev backend until real prod exists)
bun run build        # tsc + vite build → dist/ (config.json = config.prod.json)
bun run build:{local,dev,uat,prod}   # เหมือน build แต่เลือก public/config.<env>.json → dist/config.json — มีผลกับ `bun run preview` ในเครื่องเท่านั้น (S3/GCS/Docker ใช้ config.json ของ environment เอง; Vercel รัน `bun run build` เปล่า ๆ ไม่ผ่านสคริปต์นี้ — ต้องตั้ง env var `BUILD_CONFIG_FILE` เองถ้าไม่ต้องการ config.prod.json)
bun run typecheck    # tsc --noEmit เดี่ยว ๆ (gate ของ build:bump)
bun run build:bump [patch|minor|major]   # ตัด release: bump package.json + generate changelog.json/CHANGELOG.md + commit + annotated tag (local เท่านั้น ไม่ push) — ต้องอยู่บน main, tree สะอาด, ไม่ตามหลัง origin/main ที่ fetch ไว้ (git fetch เองก่อน — สคริปต์ไม่ fetch ให้); gate typecheck+lint+test:run; ไม่ส่ง level = ถามใน terminal
bun scripts/changelog-cli.ts [--rebuild]  # render CHANGELOG.md ใหม่จาก changelog.json (--rebuild = สร้าง changelog.json ใหม่จาก git tag ทับของเดิม)
bun run lint         # ESLint        bun test          # Vitest watch
bun test:run         # Single run    bun test:run path # Single file
scripts/setup-gcs-cdn.sh <bucket> <config> [domain]   # One-shot GCP infra (CDN+LB+cert) + first deploy (docs/deploy.md)
scripts/deploy-{s3,gcs,docker}.sh       # Deploy: S3/CloudFront · GCS/Cloud CDN · Docker nginx image (docs/deploy.md)
# e2e: moved to ../carmen-inventory-frontend-e2e (E2E_FRONTEND_DIR=../carmen-inventory-frontend-react bun e2e)
```

## Architecture (deltas from the source app — its CLAUDE.md still describes module patterns)

- **No server.** `lib/http-client.ts` rewrites `/api/proxy/<rest>` and `/api/external/<rest>`
  → `${BACKEND_URL}/<rest>` and attaches `Authorization: Bearer` + `x-app-id` itself.
  `API_ENDPOINTS`/hooks are identical to the source app.
- **Auth:** access token in memory (`lib/auth/token-store.ts`), refresh token in
  localStorage (`lib/auth/refresh-token-storage.ts` — single swap point for future cookie
  mode). Boot order in `main.tsx`: `loadRuntimeConfig()` → `refreshTokens()` → render.
  `RequireAuth` redirects to `/login` whenever the token store empties.
- **Routing:** React Router 7 data router in `routes/router.tsx`. Routes are **colocated**:
  each route is a `routes/<module>/<feature>/<feature>.route.tsx` file that
  `export function Component`, with its components/hooks/tests living flat beside it (no
  `page.tsx`, no `_components/`, no `[id]/` folders). Dynamic segments are native
  React Router (`path: ":id"` + `useParams`); `<feature>-edit.route.tsx` /
  `<feature>-new.route.tsx` are the list/new/edit trio. A module's shared bits sit in a
  plain `shared/` sub-folder; large features may keep organizational sub-folders
  (e.g. `pr-item-cells/`). Add new module routes under the `ProtectedShell` children.
  **All sections are migrated.** Use
  `routes/config/` / `routes/procurement/` as reference module sets. The source app's
  `playground` is intentionally NOT ported (dev-only tool); `/` redirects to `/dashboard`
  (the source `HomeComponent` landing is not ported).
- **Error boundaries:** every route is covered. Module section parents and the standalone
  shell routes carry `RouteErrorBoundaryAdapter` (in-layout error UI); the root route
  has `RootErrorBoundary` (`routes/root-error-boundary.tsx`) as a full-page catch-all so
  React Router's default error screen never shows. Both render `ModuleError` → `ErrorState`.
- **Imports (no compat layer):** the `lib/compat/*` shims are **removed** — import
  `react-router` / `use-intl` directly (ESLint blocks direct `next*` imports). The full
  Next→react-router rewrite table lives in the `migrate-source-module` skill.
- **i18n:** `use-intl` + `components/i18n-provider.tsx`; locale persisted in
  localStorage (`carmen.locale`); messages in `messages/{en,th}.json`.
- **Runtime config:** `public/config.json` (`BACKEND_URL`, `X_APP_ID`) fetched at boot —
  never hardcode backend URLs in the bundle.

## Migrating a module from the source app

Use the `migrate-source-module` skill (`.claude/skills/migrate-source-module/`) — it carries
the full colocated-route convention and Next→react-router rewrite steps. Gate: `bunx tsc
--noEmit && bun test:run` must be clean. (The `scripts/codemods/*` helpers predate the
compat removal — don't rely on them for the import step.)

## Activity sheet (ประวัติ "ใครแก้อะไร" ของรายการเดียว)

`components/share/activity-sheet.tsx` เป็นของกลาง ใช้ได้กับทุก entity — เปิดด้วย
`openActivity(id, label?)` จาก `components/share/activity-sheet-host.tsx` ซึ่ง mount
ครั้งเดียวใน `routes/root-layout.tsx` (กลไก CustomEvent ชุดเดียวกับ
`dispatchPermissionDenied`) **อย่าถือ state หรือ render sheet เองในหน้าใหม่**

จุดเข้าถึงมีสามทาง: ปุ่มในหัวหน้า (20 หน้า) · เมนู ⋯ ในแถว list ผ่าน option
`activity: { id, label }` ของ `useConfigTable` / `actionColumn` (31 list) · ปุ่มไอคอนใน
`tree-node.tsx` ของหมวดสินค้า

เปิดเฉพาะ entity ที่ backend บันทึกให้จริง — ทะเบียนอยู่ที่
`carmen-turborepo-backend-v2/apps/micro-business/src/common/activity/activity-registry.ts`
ตอนนี้ **ไม่เปิด** 7 list ที่ไม่มีในทะเบียน (certification · eco · equipment · recipe ·
period · activity-log · user-activity) เปิดไปจะได้เมนูที่กดแล้วว่างเปล่า

หัวข้อของแต่ละ action อยู่ใน `ACTION_TITLE_KEY` ของ activity-sheet ซึ่งต้องเป็นสับเซตของ
enum `enum_activity_action` ฝั่ง DB — ค่าที่ไม่มีในเอนัมจะเขียนลงไม่ได้เลย

## Interfaces config (`/system-admin/interface`)

Per-BU external-system config (Accounting / POS / PMS). Conventions, storage model, and the
list-envelope gotcha live in `routes/system-admin/interface/CLAUDE.md` (loads when working
in that folder). One cross-cutting deploy note: **Prod/UAT must set `SECRET_ENCRYPTION_KEY`**
or any secret-bearing app-config save (incl. the pre-existing `report_email`) 400s.

## React Compiler กับตาราง (`DataGrid`)

กับดักตารางค้างตอนเปลี่ยนหน้า + วิธีแก้ด้วย `"use no memo";` อยู่ใน `routes/CLAUDE.md`
(โหลดเองเมื่อทำงานใต้ `routes/`)

## Known open items

- `/api/time` was a Next route — `use-server-time` is stubbed to client time.
- Exchange-rate live-rates fetch needs a backend endpoint (`GET /api/exchange-rate?base=XXX`,
  same shape as the old Next route, which held the provider API key server-side). Config
  CRUD works; the live-rates panel degrades gracefully until then.
- Backend CORS required before production on S3/GCS static hosting (dev uses the Vite
  proxy; the **Docker image needs no CORS** — its nginx proxies `/api/*` itself).
- Local dev against the local backend: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`.
- Backend bug ที่ผูกกับโมดูลเดียว ย้ายไปอยู่ข้างโมดูลแล้ว (โหลดเองเมื่อทำงานในโฟลเดอร์นั้น):
  decimal qty ที่ `.int()` ปัด → `routes/CLAUDE.md` · dashboard-widgets 500 →
  `routes/dashboard/CLAUDE.md` · PR list ไม่มี `audit` → `routes/procurement/CLAUDE.md`
- `scripts/changelog.ts`'s conventional-commit regex captures the breaking-change `!`
  marker (e.g. `feat(api)!: …`) but nothing reads it — deliberately not implementing a
  breaking-change badge in What's New for now; such commits render like ordinary features.
- **License gating ฝั่ง FE ครอบไม่ครบโดยตั้งใจ** — จุดที่ปิดปุ่มเขียนตาม `canWrite` จริง
  **มีแค่ 3 จุด** คือ `FormToolbar` (Save/Edit/Delete), row actions ของ data-grid
  (`useConfigTable` → `DataGridRowActions`) และ `ConfigListTemplate` (ปุ่ม Add + `readOnly`
  ของ dialog แก้ไข) ปุ่มอื่นที่เรียก mutation ตรงจะยังกดได้แล้วเด้ง 403 จาก backend
  ซึ่งยอมรับได้เพราะ `LicenseInterceptor` ที่ gateway คือตัวบังคับจริง การไล่ปิดทุกปุ่ม
  เป็นงานที่ไม่มีวันจบและตรวจไม่ได้ว่าครบ
- **`useCan().guard()` ยังไม่มีผู้เรียกสักจุดเดียวในแอป** — มันเช็ค `canWrite` ก่อน `can()`
  แล้วเด้ง dialog ให้ตามเหตุผล (expired/permission) และมีเทสต์ครบ แต่ไม่มีใคร destructure
  ออกมาใช้ (ทุก call site ของ `useCan()` เอาแค่ `can`/`isAdmin`/`canWrite`) — **อย่าอ่านว่า
  "การเขียนถูกบล็อกทุกที่ที่มี guard"** ถ้าจะใช้ต้องไปเสียบที่ handler เอง:
  `const { guard } = useCan(); <Button onClick={guard(PERMISSIONS.x.create, doCreate)}>`
  เก็บโค้ดไว้เพราะมันถูกและเป็นทางลัดที่พร้อมใช้ ไม่ใช่เพราะมันทำงานอยู่
- **license feature key ≠ permission key** — `constant/module-list.ts` มีฟิลด์
  `licenseFeature` ไว้ระบุ feature ของ leaf ตรง ๆ เมื่อ key ที่คำนวณจาก `permission`
  ไม่ตรง catalog ของ backend (เช่น `report_analytics.view` → `report.list`,
  `product_management.unit.view` → `configuration.unit`) ค่าที่ใส่ต้องมาจาก
  `LICENSE_ROUTE_FEATURES` ของ backend เท่านั้น และ
  `constant/module-list.license-feature.test.ts` จะแดงถ้า key ที่ผลิตได้ไม่มีใน catalog
  (สำเนา catalog อยู่ที่ `constant/__fixtures__/license-catalog.ts` พร้อมวิธีอัปเดต)
- **สวิตช์ `LICENSE_ENFORCEMENT` ต้องเปิดเองตอน rollout** — เป็น optional key ใน
  `RuntimeConfig` (`lib/runtime-config.ts`), default `false` (shadow mode: banner/ปุ่ม
  เขียนไม่ล็อกอะไรเลยแม้ `state` จะเป็น `expired`/`inactive`/`none`) ไฟล์
  `public/config.{local,dev,uat,prod}.json` ของแต่ละ environment จริงถูก **gitignore**
  (`public/config*.json` ยกเว้น `public/config.sample.json` ซึ่งมีคีย์นี้เป็นตัวอย่างอยู่แล้ว)
  จึงต้อง**เติมคีย์ `LICENSE_ENFORCEMENT: true` ด้วยมือ** ในไฟล์ config ของ environment
  นั้นเมื่อพร้อมเปิดใช้งานจริง — ไม่มีทางเปิดผ่าน env var หรือ build flag
