# Carmen Inventory Frontend — Next.js → Vite + React Router SPA (Static / S3+CDN)

**Date:** 2026-06-11
**Status:** ✅ Implemented — all phases (0-9) merged to `main` 2026-06-12; migration complete (125 routes)
**Source app:** `../carmen-inventory-frontend/` (Next.js 16 App Router, ~134 routes, ~179k LOC)
**Target repo:** `carmen-inventory-frontend-react`

---

## 1. Goal & Scope

Port the existing Carmen ERP inventory frontend from **Next.js 16 (App Router, SSR/server API routes)** to a **Vite + React + React Router 7 single-page application** that builds to static files and is hosted on **S3 + CloudFront (CDN)**. The browser calls the backend **directly via CORS** — there is no server runtime.

The app is fully auth-gated, so true per-route SSG provides no value and is impossible for `[id]` routes with unknown IDs. "SSG" here means **a static bundle served from a CDN** (SPA), not per-route pre-rendered HTML.

### In scope (this spec — Phase 0 / Foundation)

- Scaffold Vite + React + TypeScript + React Router 7 (library/data mode, no SSR).
- Shared infrastructure ported from the source: `components/`, `hooks/`, `lib/`, `utils/`, `types/`, `constant/`, `i18n/messages/`.
- Client-side auth + http-client (token in memory, refresh via backend httpOnly cookie).
- i18n via `use-intl` + `IntlProvider`.
- Routing skeleton (layout routes, guards, lazy code-splitting) — routes wired but module pages migrated in later phases.
- Build + deploy pipeline to S3/CloudFront with SPA fallback + runtime `config.json`.
- Codemods for the mechanical conversions.
- Smoke path: login → boot/refresh → dashboard shell rendering.

### Out of scope (later phases — own spec/plan each)

- Migrating the 134 module pages (config, procurement, inventory-management, vendor-management, store-operation, operation-plan, product-management, system-admin, report).

---

## 2. Target Architecture

```
Browser (SPA, static from CloudFront)
  ├─ React Router 7 (createBrowserRouter, lazy routes)
  ├─ TanStack Query (server cache)  ── http-client ──▶  BACKEND_URL (CORS, Bearer + credentials)
  ├─ use-intl IntlProvider (en/th)
  ├─ auth-store (access token in memory)
  └─ runtime config.json (BACKEND_URL per environment)

CloudFront: 403/404 → /index.html (200); hashed assets cached long, index.html no-cache
S3: private bucket + OAC
Backend: must allow CORS from CDN origin, refresh cookie SameSite=None; Secure, ACAC: true
```

**Migration principle:** clone the Next-agnostic source code nearly verbatim and change only the points that touch Next APIs. Keep the `@/*` path alias pointing at repo root and keep the original folder layout (`components/ hooks/ lib/ utils/ types/ constant/ i18n/`) at root so existing import paths are reused unchanged. The `app/` directory becomes `routes/` (route configuration).

---

## 3. Next → Vite / React Router Mapping

| Source (Next) | Target | Volume |
|---|---|---|
| `app/**/page.tsx` (file routing) | `createBrowserRouter` route objects + `lazy()` import | 134 routes |
| `(root)` / `(external)` layout groups | nested layout routes | 2 layouts |
| `app/**/layout.tsx` | layout route components | — |
| `next/navigation` (`useRouter`/`usePathname`/`useSearchParams`/`useParams`) | `react-router` (`useNavigate`/`useLocation`/`useSearchParams`/`useParams`) | 77 files |
| `next/link` `<Link href>` | `react-router` `<Link to>` | 34 files |
| `next/image` | plain `<img>` | 4 files |
| **`next-intl`** (`useTranslations`, `useFormatter`, `useLocale`) | **`use-intl`** (same core lib, identical hook API) + `<IntlProvider>` | 624 files — import path only |
| `app/api/*` (auth, proxy, exchange-rate, time) | **removed** — http-client calls backend directly | 7 routes |
| `next-themes` | kept (works with plain React) | — |
| `nextjs-toploader` | custom top-loader bound to react-router navigation state | — |
| React Compiler (Next built-in) | `babel-plugin-react-compiler` in Vite config | — |
| `process.env.NEXT_PUBLIC_*` | runtime `config.json` (+ `import.meta.env.VITE_*` for build-time only values) | — |

**i18n key insight:** `next-intl` is built on top of `use-intl`; `useTranslations`/`useFormatter`/`useLocale` re-export from `use-intl`. Switching to `use-intl` + a client `<IntlProvider>` keeps the hook API identical, so the 624 files need only an import-path change (codemod), and `i18n/messages/en.json` + `th.json` are reused as-is.

---

## 4. Auth & http-client (client-side)

Today auth/refresh runs server-side (`/api/auth/*`). With no server, this moves entirely into the browser.

> **Amended 2026-06-11 after source-code investigation:** the backend does **not** set cookies today — it returns `access_token` + `refresh_token` in the JSON body on login, and the refresh endpoint is `POST {BACKEND}/api/auth/refresh-token` taking `{ refresh_token }` in the **request body** (the Next server was the one managing httpOnly cookies on its own origin). Waiting for backend cookie support would block Phase 0, so the refresh token is stored in **localStorage** (matches the persistence UX of the old 7-day cookie). Storage sits behind a small adapter module so it can swap to httpOnly-cookie mode later if the backend adds support.

- **Token storage:** access token in **memory** (`lib/auth/token-store.ts`, module-level). Refresh token in **localStorage** behind `lib/auth/refresh-token-storage.ts` (single swap point for future cookie mode).
- **Boot / reload:** on app start, read refresh token from storage → `POST {BACKEND}/api/auth/refresh-token` → new access token into memory before first render. Success → logged-in; failure → redirect `/login`.
- **http-client (ported from source):** keep the mutex refresh + client-side sliding-window rate-limiter. Drop the SSRF guard (base URL is now fixed). URL rewrite: `/api/proxy/<rest>` and `/api/external/<rest>` → `${BACKEND_URL}/<rest>` — so `API_ENDPOINTS` and all entity hooks are reused unchanged. Attach `Authorization: Bearer <token>` from token-store + `x-app-id` header. Base URL from runtime config.
- **401 flow:** request gets 401 → refresh (shared mutex promise) → success retries the request; failure clears the store and triggers logout/redirect. http-client stays decoupled from the router via an event/observer (not a direct router import).
- **Route guard:** the `(root)` layout route checks auth-store; no token → `<Navigate to="/login" />`.

### Backend requirements (must be coordinated)

- CORS allow the CloudFront origin (and `localhost` dev origins), including the `Authorization` and `x-app-id` request headers.
- *(Optional future hardening)* httpOnly-cookie refresh flow: backend sets refresh cookie `SameSite=None; Secure` + `Access-Control-Allow-Credentials: true`; the SPA then swaps `refresh-token-storage.ts` to cookie mode.

---

## 5. Build & Deploy (S3 / CloudFront)

- **Vite build** → `dist/` (`index.html` + hashed assets). Route-level code-splitting via `lazy()` is mandatory given 134 routes.
- **Runtime config:** ship a `config.json` (containing `BACKEND_URL` etc.) fetched at boot, so a **single build artifact deploys to every environment** (uat/aws) without rebuild. Per-environment values live in the deployed `config.json`, not the bundle.
- **S3:** private bucket + Origin Access Control (OAC).
- **CloudFront:** custom error responses **403 & 404 → `/index.html` with 200** for SPA client routing. Cache hashed assets long; serve `index.html` with no-cache.

---

## 6. Migration Roadmap (context — only Phase 0 implemented by this spec)

1. **Phase 0 (this spec):** scaffold + full foundation + codemods (next-intl→use-intl, next/navigation→react-router, next/link) + port `components/ui` + DataGrid + core hooks (`useURL`/`useListPageState`/`useDataGridState` etc.) + smoke path (login + dashboard shell).
2. **Phase 1:** `config/*` modules (mostly simple dialog forms — proves the pattern end-to-end).
3. **Phases 2+:** procurement → inventory-management → vendor-management → store-operation → operation-plan → product-management → system-admin → report. Each module gets its own spec/plan.

---

## 7. Testing

- Keep **Vitest + Testing Library** (`@vitejs/plugin-react` already in use — direct port).
- **Playwright e2e** ported, base URL pointed at the Vite preview server.
- Phase 0 must include tests for: http-client (refresh mutex, 401 retry), auth-store, route guard, i18n provider render.

---

## 8. Key Decisions Log

- Target stack: **Vite + React Router 7 SPA** (leave Next.js entirely).
- Backend access: **direct browser → backend via CORS** (no server/edge proxy).
- Token: **access in memory + refresh in localStorage** (amended — backend has no cookie support today; storage behind an adapter so cookie mode can swap in later).
- i18n: **use-intl** (not a heavier rewrite to react-i18next) to minimize churn across 624 files.
- env: **runtime `config.json`** (single artifact, all environments).
- Folder layout: **keep `@/*` → repo root and original folder names** to reuse import paths; `app/` → `routes/`.
- Scope: **Phase 0 (foundation) + migration strategy only** — not the 134 module pages.
