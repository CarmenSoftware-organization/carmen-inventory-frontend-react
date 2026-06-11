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
  under the `ProtectedShell` children.
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
3. Create `routes/<path>/page.tsx` re-exporting the page component + `Component` export;
   register it in `routes/router.tsx` with `lazy:`.
4. `bunx tsc --noEmit && bun test:run` must be clean.

## Known Phase 0 open items

- `/api/exchange-rate` + `/api/time` were Next routes — stubbed/deferred (see plan).
- Backend CORS required before production (dev uses Vite proxy).
- Live-backend smoke: verified against the local gateway (`carmen-turborepo-backend-v2`
  on :4000) — UI→proxy→backend round-trip, 401 error path, and 429 RATE_LIMITED
  countdown all confirmed end-to-end. Remaining: success-path login → dashboard shell
  (needs real credentials; UAT host needs VPN).
- Local dev against the local backend: `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`.
- A few leaf files live under `app/` (schemas/mock-data/change-password-dialog) — imported
  by hooks/components; reconcile when their module routes migrate.
