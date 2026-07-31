# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Carmen inventory ERP frontend — **Vite + React Router SPA port** of the Next.js app at
`../carmen-inventory-frontend/`. Static bundle on S3/CloudFront; the browser calls the
backend directly. Spec: `docs/superpowers/specs/2026-06-11-carmen-react-ssg-migration-design.md`.

## ภาษาในการสื่อสาร

สื่อสารกับ user เป็น **ภาษาไทย** เสมอ — รวมถึง commit message (เขียนเป็นภาษาไทย)
ยกเว้น code / identifier และ **PR ที่ยังใช้ภาษาอังกฤษ**

## Commands

```bash
bun dev              # Dev server = dev:local (VITE_DEV_PROXY_TARGET=<backend> to proxy /api)
bun run dev:{local,dev,uat,prod}   # Dev server per backend env → public/config.<env>.json (prod = dev backend until real prod exists)
bun run build        # tsc + vite build → dist/
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

## Interfaces config (`/system-admin/interface`)

Per-BU external-system config (Accounting / POS / PMS). Conventions, storage model, and the
list-envelope gotcha live in `routes/system-admin/interface/CLAUDE.md` (loads when working
in that folder). One cross-cutting deploy note: **Prod/UAT must set `SECRET_ENCRYPTION_KEY`**
or any secret-bearing app-config save (incl. the pre-existing `report_email`) 400s.

## Known open items

- `/api/time` was a Next route — `use-server-time` is stubbed to client time.
- Exchange-rate live-rates fetch needs a backend endpoint (`GET /api/exchange-rate?base=XXX`,
  same shape as the old Next route, which held the provider API key server-side). Config
  CRUD works; the live-rates panel degrades gracefully until then.
- Backend CORS required before production on S3/GCS static hosting (dev uses the Vite
  proxy; the **Docker image needs no CORS** — its nginx proxies `/api/*` itself).
- Live-backend smoke: **fully verified** against the local gateway
  (`carmen-turborepo-backend-v2` on :4000) — login → dashboard shell (sidebar/navbar/
  profile/BU), reload session-restore, 401 error path, 429 RATE_LIMITED countdown,
  access token never persisted. Zero console errors. (UAT still needs VPN.)
- Local dev against the local backend: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`.
- `app/` is gone (2026-06-12 consolidation): the five Phase-0 pre-copied leaves
  (workflow/wastage/stock-replenishment schemas + the two profile leaves) now live only
  under `routes/`; `components/navbar/user-profile.tsx` and the hooks import the
  `routes/` copies directly.
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
