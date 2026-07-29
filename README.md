# carmen-inventory-frontend-react

Carmen Inventory — ERP for hospitality supply chain. **Vite + React Router 7 SPA**, fully
migrated from the Next.js app at [carmen-inventory-frontend](../carmen-inventory-frontend)
and built for static hosting on **S3 + CloudFront** (no server runtime; the browser talks
to the backend directly).

**Migration status: complete** — 125 lazy routes across every section:

| Section | Routes |
|---|---|
| Configuration (`/config/*`) | unit, currency, exchange-rate, department, location, delivery-point, tax-profile + 8 more |
| Procurement (`/procurement/*`) | purchase-request (+template), purchase-order (+from-price-list), goods-receive-note, credit-note, approval |
| Inventory (`/inventory-management/*`) | inventory-adjustment, transaction, physical-count (+entry/review), spot-check (+review/by-location), period-end |
| Vendor (`/vendor-management/*`) | vendor, price-list, price-list-template, request-price-list |
| Store ops (`/store-operation/*`) | store-requisition, wastage-reporting, stock-replenishment |
| Operation plan (`/operation-plan/*`) | recipe, category, cuisine, equipment (+categories) |
| Products (`/product-management/*`) | product, category |
| System admin (`/system-admin/*`) | user, role, workflow designer, notification-template, query-dataset, period + 7 more |
| Reports (`/report/*`) | list, schedules, history |
| Shell | dashboard, profile (+setting), notifications, login |
| Public (no auth) | `/pl/:url_token` — vendor-facing price list |

Not ported by design: `playground` (dev-only fixtures); `/` redirects to `/dashboard`.

## Tech stack

Vite 7 · React 19 (React Compiler) · TypeScript 5 (strict) · React Router 7 (lazy data
routes) · Tailwind CSS 4 + shadcn/ui · TanStack Query 5 + Table 8 · react-hook-form 7 +
zod 4 · use-intl (en/th) · Vitest + Testing Library · **Bun** runtime

## Quickstart

```bash
bun install
cp public/config.sample.json public/config.local.json   # set X_APP_ID; keep BACKEND_URL="" for proxy mode
VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev   # proxy /api/* to your backend (avoids CORS in dev)
```

`bun dev` (alias for `bun run dev:local`) serves `public/config.local.json` as `/config.json` —
there is no literal `public/config.json` in dev. Use `bun run dev:dev` / `dev:uat` / `dev:prod`
to point at `public/config.dev.json` / `config.uat.json` / `config.prod.json` instead.

Open http://localhost:3000 (Vite picks the next port if busy) and log in with a backend
account.

## Commands

```bash
bun dev              # Dev server (VITE_DEV_PROXY_TARGET=<backend> to proxy /api)
bun run dev:{local,dev,uat,prod}   # Dev server serving public/config.<env>.json (dev aliases dev:local)
bun run build        # tsc + vite build → dist/
bun run preview      # Serve the production build locally
bun run lint         # ESLint          bun test            # Vitest watch
bun test:run         # Run all tests   bun test:run <path> # Single file
scripts/deploy-s3.sh <bucket> <cloudfront-id>       # Deploy to S3/CloudFront (docs/deploy.md)
scripts/deploy-gcs.sh <bucket> [url-map]            # Deploy to GCS/Cloud CDN (docs/deploy.md)
scripts/deploy-docker.sh [tag] [registry]           # Build/push Docker image (nginx + /api proxy)
```

## Architecture in one minute

- **No server.** `lib/http-client.ts` rewrites the legacy `/api/proxy/<rest>` and
  `/api/external/<rest>` paths to `${BACKEND_URL}/<rest>` and attaches
  `Authorization: Bearer` + `x-app-id` itself (with 401 → refresh → retry).
- **Auth:** access token in memory only; refresh token in localStorage behind
  `lib/auth/refresh-token-storage.ts`. Boot: `loadRuntimeConfig()` → `refreshTokens()` →
  render. `RequireAuth` redirects to `/login` whenever the token store empties.
- **Runtime config:** `public/config.json` (`BACKEND_URL`, `X_APP_ID`, optional `WS_URL`)
  is fetched at boot — one build artifact deploys to every environment.
- **Routing:** lazy route modules in `routes/<section>/.../page.tsx`, each exporting
  `Component`; section parents carry a shared error-boundary adapter.

Full guidance for working in this repo (incl. the module-migration recipe used to port
the app): **CLAUDE.md**. Design history: `docs/superpowers/specs/` + `docs/superpowers/plans/`.

## Deploying

Three supported targets — step-by-step in [docs/deploy.md](docs/deploy.md):

| Target | Model | Backend CORS needed? |
|---|---|---|
| **AWS S3 + CloudFront** | private bucket + OAC, 403/404 → `/index.html` fallback | yes |
| **GCS (+ Cloud CDN)** | bucket website fallback or LB backend bucket | yes |
| **Docker** | nginx serves `dist/` and **proxies `/api/*` to the backend itself** | **no** |

For the static-CDN targets the per-environment `config.json` lives on the bucket; the
Docker image renders it from env (`BACKEND_URL`, `X_APP_ID`, `WS_URL`) at container start.

> CORS (S3/GCS only): allow the CDN origin, headers `Authorization`, `Content-Type`,
> `x-app-id`. Dev never needs CORS thanks to the Vite proxy.

## Testing

- **288 unit/integration tests** (Vitest + Testing Library) — auth flows (refresh mutex,
  401 retry), http-client URL rewrite, route guards, i18n, compat layer, ported module tests.
- **Playwright e2e** lives in the dedicated suite
  [carmen-inventory-frontend-e2e](../carmen-inventory-frontend-e2e) (191+ TC-annotated
  tests, frontend-agnostic). Run it against this SPA with:
  `E2E_FRONTEND_DIR=../carmen-inventory-frontend-react VITE_DEV_PROXY_TARGET=<backend> bun e2e`
  — `002-spa-smoke.spec.ts` there covers the SPA-specific boot/auth-guard behavior.
