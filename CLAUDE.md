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
bunx playwright test # e2e (needs build)
E2E_EMAIL=.. E2E_PASSWORD=.. bunx playwright test   # authenticated e2e (needs local backend :4000)
scripts/deploy-s3.sh <bucket> <cf-id>   # Deploy (see docs/deploy.md)
```

## Architecture (deltas from the source app — its CLAUDE.md still describes module patterns)

- **No server.** `lib/http-client.ts` rewrites `/api/proxy/<rest>` and `/api/external/<rest>`
  → `${BACKEND_URL}/<rest>` and attaches `Authorization: Bearer` + `x-app-id` itself.
  `API_ENDPOINTS`/hooks are identical to the source app.
- **Auth:** access token in memory (`lib/auth/token-store.ts`), refresh token in
  localStorage (`lib/auth/refresh-token-storage.ts` — single swap point for future cookie
  mode). Boot order in `main.tsx`: `loadRuntimeConfig()` → `refreshTokens()` → render.
  `RequireAuth` redirects to `/login` whenever the token store empties.
- **Routing:** React Router 7 data router in `routes/router.tsx`. Pages live in
  `routes/<module>/page.tsx` and must `export const Component`. Add new module routes
  under the `ProtectedShell` children. **All sections migrated:**
  `routes/{config,procurement,inventory-management,vendor-management,store-operation,operation-plan,product-management,system-admin,report}/`
  (section parents with `RouteErrorBoundaryAdapter`) plus the standalone shell routes
  `dashboard/`, `profile/` (+ `profile/setting`) and `notifications/` registered directly
  as `ProtectedShell` children, and the public `/pl/:url_token` price-list route. Use
  `routes/config/` / `routes/procurement/` as reference module sets. The source app's
  `playground` is intentionally NOT ported (dev-only tool); `/` redirects to `/dashboard`
  (the source `HomeComponent` landing is not ported).
- **Next compat:** `next/navigation` → `@/lib/compat/navigation`, `next/link` →
  `@/lib/compat/link`, `next-intl` → `use-intl`. ESLint blocks direct `next*` imports.
  New code should import `react-router` directly.
- **i18n:** `use-intl` + `components/i18n-provider.tsx`; locale persisted in
  localStorage (`carmen.locale`); messages in `messages/{en,th}.json`.
- **Runtime config:** `public/config.json` (`BACKEND_URL`, `X_APP_ID`) fetched at boot —
  never hardcode backend URLs in the bundle.

## Migrating a module from the source app

1. Copy the module's `_components/`, hook and types files from `../carmen-inventory-frontend`.
2. Run `scripts/codemods/next-to-vite.sh <dirs>`.
3. Run `scripts/codemods/nextpage-to-route.sh routes/<path>/**/page.tsx` (strips Next
   metadata, appends the `Component` export). `[id]` pages need hand-conversion to
   `useParams` — see `routes/config/department/[id]/page.tsx` as the reference.
   `next/dynamic` usages convert to `lazy()` + `<Suspense fallback={null}>` — see
   `routes/config/currency/_components/currency-component.tsx`.
4. Create `routes/<path>/page.tsx` re-exporting the page component + `Component` export;
   register it in `routes/router.tsx` with `lazy:`.
5. `bunx tsc --noEmit && bun test:run` must be clean.

## Known open items

- `/api/time` was a Next route — `use-server-time` is stubbed to client time.
- Exchange-rate live-rates fetch needs a backend endpoint (`GET /api/exchange-rate?base=XXX`,
  same shape as the old Next route, which held the provider API key server-side). Config
  CRUD works; the live-rates panel degrades gracefully until then.
- Backend CORS required before production (dev uses Vite proxy).
- Live-backend smoke: **fully verified** against the local gateway
  (`carmen-turborepo-backend-v2` on :4000) — login → dashboard shell (sidebar/navbar/
  profile/BU), reload session-restore, 401 error path, 429 RATE_LIMITED countdown,
  access token never persisted. Zero console errors. (UAT still needs VPN.)
- Local dev against the local backend: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`.
- A few Phase-0 pre-copied leaf files still live under `app/` (workflow/wastage/stock-
  replenishment schemas + `profile/_components/{change-password-dialog,profile-form-schema}`)
  — imported by `components/navbar/user-profile.tsx` and a couple of hooks. The migrated
  `routes/profile/_components/` now also contains its own copies of those two profile
  leaves (the route tree imports the `routes/` copy; the navbar still imports the `app/`
  copy). The duplication is intentional and harmless — keeping `app/` untouched preserves
  the `git status app/` clean invariant; consolidate onto the `routes/` copies in a later
  cleanup if desired.
- PO from-price-list flow depends on price-list data (vendor-management phase) — page renders; full flow testable after that phase migrates.
