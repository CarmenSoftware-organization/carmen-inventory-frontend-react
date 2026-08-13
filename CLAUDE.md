# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
  **All sections migrated:**
  `routes/{config,procurement,inventory-management,vendor-management,store-operation,operation-plan,product-management,system-admin,report}/`
  (section parents with `RouteErrorBoundaryAdapter`) plus the standalone shell routes
  `dashboard/`, `profile/` (+ `profile/setting`) and `notifications/` registered directly
  as `ProtectedShell` children, and the public `/pl/:url_token` price-list route. Use
  `routes/config/` / `routes/procurement/` as reference module sets. The source app's
  `playground` is intentionally NOT ported (dev-only tool); `/` redirects to `/dashboard`
  (the source `HomeComponent` landing is not ported).
- **Error boundaries:** every route is covered. Module section parents and the standalone
  shell routes carry `RouteErrorBoundaryAdapter` (in-layout error UI); the root route
  has `RootErrorBoundary` (`routes/root-error-boundary.tsx`) as a full-page catch-all so
  React Router's default error screen never shows. Both render `ModuleError` → `ErrorState`.
- **Imports (no compat layer):** import `react-router` directly — `Link` (use `to`, not
  `href`), `useNavigate` (not `useRouter`; `push`→`navigate`, `replace`→
  `navigate(x, { replace: true })`, `back`→`navigate(-1)`), `useLocation().pathname` (not
  `usePathname`), `useParams`, `useSearchParams` (returns a `[params, setParams]` tuple).
  `next-intl` → `use-intl`. ESLint blocks direct `next*` imports. The former
  `lib/compat/*` shims have been **removed** — there is no compat layer.
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
- Backend bug (not frontend): `GET /api/me/dashboard-widgets?bu_code=T02` returns 500
  from the gateway itself (verified identical direct vs proxied). Dashboard degrades
  gracefully; report to the carmen-turborepo-backend-v2 team.
- Backend bug (not frontend): `ValidateSchema.quantity` is `z.number().int()` while the
  DB columns are `Decimal(20,5)` — any decimal `requested_qty` / `approved_qty` /
  `foc_qty` 400s at the API gate even though the schema stores it. Decimal quantities
  are valid business-wise (2.5 kg). Hits every qty-bearing module (PR/PO/GRN/SR/CN);
  the fix is dropping `.int()` from the 3 copies of `ValidateSchema` in
  carmen-turborepo-backend-v2 (`backend-gateway`, `micro-business`, `micro-file`).
  Frontend deliberately does NOT round to compensate — that would corrupt the data.
- Backend bug (not frontend): `GET /api/purchase-requests` (PR list) carries a bare
  `@EnrichAuditUsers()`, which only enriches path `''` — but the rows sit at
  `data[].data[]` (multi-BU envelope), so the interceptor never reaches them. Rows come
  back with a raw `created_at` still attached and **no `audit` object at all**, so the
  Created/Updated columns on the PR list render blank (`pr-component.tsx` Excel export,
  `pr-card.tsx` grid card). Verified by hitting the gateway directly 2026-08-04. Fix is
  `paths` on the decorator so it reaches the nested rows — same class as the SR list fix.
  Frontend deliberately keeps reading `audit` rather than falling back to the raw field:
  the raw one disappears the moment the decorator is fixed.
- `scripts/changelog.ts`'s conventional-commit regex captures the breaking-change `!`
  marker (e.g. `feat(api)!: …`) but nothing reads it — deliberately not implementing a
  breaking-change badge in What's New for now; such commits render like ordinary features.
