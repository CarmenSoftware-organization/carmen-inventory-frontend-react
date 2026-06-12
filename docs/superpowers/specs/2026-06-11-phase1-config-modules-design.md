# Phase 1 — Config Modules Migration

**Date:** 2026-06-11
**Status:** ✅ Implemented & merged (PR #1, 2026-06-11)
**Depends on:** Phase 0 foundation (merged via PR #1 branch `phase0-foundation`)
**Source:** `../carmen-inventory-frontend/app/(root)/config/` — 88 files, ~8.4k LOC

---

## 1. Goal & Scope

Migrate the entire `config/*` section of the source Next.js app to the SPA: **15 modules + the config landing page**. This is the pattern-proving phase — most modules are simple `createConfigCrud` dialog-based CRUD, so the per-module cost is low and the migration recipe gets validated end-to-end.

### Modules

| Type | Modules |
|---|---|
| **Dialog-based** (single route) | adjustment-type, business-type, certification, credit-note-reason, credit-term, currency, delivery-point, eco, exchange-rate, extra-cost, tax-profile, unit |
| **Page-based** (list + `new` + `[id]`) | department, location |
| **Landing** | `config/page.tsx` + `config-dashboard.tsx` |

All hooks (`use-unit`, `use-currency`, …), types, constants, lookup components, and the DataGrid stack were already ported in Phase 0 — this phase ports only the **route-level code** (`page.tsx` files + `_components/` dirs).

### Out of scope

- Other sections (procurement, inventory, …) — later phases.
- Fixing the exchange-rate live-rates fetch (see §4 — backend dependency).

---

## 2. Route Mapping

```
$SRC/app/(root)/config/<module>/**  →  routes/config/<module>/**   (copy verbatim + codemod)
```

- **Folder names kept identical** (including `[id]` and `new`) so copying is mechanical; the React Router path is declared separately in `routes/router.tsx` (`:id` syntax).
- Every `page.tsx` gains `export const Component = <Page>;` (lazy-route convention) and loses any `export const metadata`.
- Router registration: a `config` parent route under `ProtectedShell` with children:

```tsx
{
  path: "config",
  ErrorBoundary: ConfigErrorBoundary,   // see §3
  children: [
    { index: true, lazy: () => import("./config/page") },
    { path: "unit", lazy: () => import("./config/unit/page") },
    // … one per dialog module …
    { path: "department", lazy: () => import("./config/department/page") },
    { path: "department/new", lazy: () => import("./config/department/new/page") },
    { path: "department/:id", lazy: () => import("./config/department/[id]/page") },
    { path: "location", lazy: () => import("./config/location/page") },
    { path: "location/new", lazy: () => import("./config/location/new/page") },
    { path: "location/:id", lazy: () => import("./config/location/[id]/page") },
  ],
}
```

- `[id]` pages already read params via `useParams` from the compat layer (codemod) — shape matches.

## 3. Error Boundary

Source `config/error.tsx` re-exports `components/ui/module-error-boundary` (Next contract: `{ error, reset }` props). React Router exposes errors via `useRouteError()` instead. Add one small adapter, reusable by every later phase:

```tsx
// routes/module-error-boundary-adapter.tsx
// แปลงสัญญา error boundary ของ react-router → ModuleErrorBoundary (Next contract)
import { useNavigate, useRouteError } from "react-router";
import ModuleErrorBoundary from "@/components/ui/module-error-boundary";

export function RouteErrorBoundaryAdapter() {
  const error = useRouteError();
  const navigate = useNavigate();
  return (
    <ModuleErrorBoundary
      error={error instanceof Error ? error : new Error(String(error))}
      reset={() => void navigate(0)}   // remount via same-route navigation
    />
  );
}
```

(Verify `ModuleErrorBoundary`'s actual prop contract during implementation and adapt `reset` semantics — the goal is "retry remounts the subtree".)

## 4. Exchange-rate module — backend dependency

The source module's "fetch live rates" feature called the Next route `/api/exchange-rate`, which used a **server-side secret** (`EXCHANGE_RATE_API_KEY`) to call an external rates API. A static SPA cannot hold that secret.

**Decision:** port the module; manual CRUD (backed by `/api/proxy/...`) works fully. The live-rates action will receive an HTTP error and surface it through the module's existing error handling — acceptable degradation for Phase 1.

**Backend request (tracked open item):** add `GET /api/exchange-rate?base=XXX` to the gateway (same response shape as the Next route) — then `use-exchange-rate.ts`'s existing URL passes the http-client `/api/` rewrite unchanged and the feature lights up with zero frontend work.

## 5. Migration Recipe (per module — same as CLAUDE.md, refined)

1. `cp -R "$SRC/app/(root)/config/<module>" routes/config/<module>`
2. `scripts/codemods/next-to-vite.sh routes`
3. Strip `metadata` export; append `export const Component`.
4. Register route(s) in `routes/router.tsx`.
5. Gates: `bunx tsc --noEmit` + `bun run lint` + `bun run test:run` clean.

Module batches for implementation (keeps reviews focused):
- **Batch A:** landing + unit + currency (proves dialog pattern + landing)
- **Batch B:** remaining 10 dialog modules
- **Batch C:** department + location (page-based pattern)
- **Batch D:** error boundary adapter + e2e + docs

## 6. Verification

- **Unit/infra gates** per batch: tsc, lint, full vitest suite.
- **Authenticated e2e (new):** extend Playwright with a credentials-gated spec — `E2E_EMAIL`/`E2E_PASSWORD` env vars (test skips when unset, so CI without credentials stays green):
  1. login via the real form against `VITE_DEV_PROXY_TARGET` backend
  2. navigate to `/config/unit` → DataGrid renders with data rows
  3. navigate to `/config/department` → list renders
- **Manual smoke** with the local gateway (`:4000`) using the user-provided test credentials.

## 7. Acceptance Criteria

1. All 15 module routes + landing reachable under the shell, rendering their real UI.
2. CRUD round-trip works against the local backend for at least: unit (dialog) and department (page-based).
3. No `next/*` imports, no `process.*` (lint-enforced), tsc/lint/tests/build/e2e all green.
4. Exchange-rate degradation documented; backend endpoint request recorded as open item.
