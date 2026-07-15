# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Carmen inventory ERP frontend — **Vite + React Router SPA port** of the Next.js app at
`../carmen-inventory-frontend/`. Static bundle on S3/CloudFront; the browser calls the
backend directly. Spec: `docs/superpowers/specs/2026-06-11-carmen-react-ssg-migration-design.md`.

## ภาษาในการสื่อสาร

สื่อสารกับ user เป็น **ภาษาไทย** เสมอ (ยกเว้น code, commit message, PR ใช้ภาษาอังกฤษ)

## Commands

```bash
bun dev              # Dev server (VITE_DEV_PROXY_TARGET=<backend> to proxy /api)
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

All sections are already ported **and colocated**. For a new/updated module, follow the
colocated convention (the `scripts/codemods/*` helpers predate the compat removal and still
rewrite to `lib/compat/*` — don't rely on them for the import step):

1. Copy the module's components, hooks and types from `../carmen-inventory-frontend` into
   `routes/<module>/<feature>/` — flat, no `_components/` wrapper.
2. Rewrite Next APIs to react-router directly (see "Imports" above): `next/link`→`Link`
   (`to`), `next/navigation`→`useNavigate`/`useLocation`/`useParams`/`useSearchParams`,
   `next-intl`→`use-intl`. `next/dynamic` → `lazy()` + `<Suspense fallback={null}>` (see
   `routes/config/currency/currency-component.tsx`). Drop no-op `router.refresh()` calls
   (data comes from TanStack Query invalidation).
3. Name each route file `<feature>.route.tsx` exporting `Component`. Dynamic routes use
   `useParams` + native `:id` (see `routes/config/department/department-edit.route.tsx`).
4. Register routes in `routes/router.tsx` with `lazy: () => import("./<...>.route")`, under
   the module's section parent (which carries `RouteErrorBoundaryAdapter`).
5. `bunx tsc --noEmit && bun test:run` must be clean.

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
