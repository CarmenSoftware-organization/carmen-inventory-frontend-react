# Phases 3-9 — Remaining Sections Migration Plan (Autonomous Run)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. The migration recipe is canonical in CLAUDE.md ("Migrating a module") — proven across Phases 1-2 (config + procurement, 36 routes, zero new patterns). This plan covers the rest of the app.

**Goal:** Migrate every remaining section to complete the SPA port: inventory-management, vendor-management (+ public price-list), store-operation, operation-plan, product-management, system-admin, report, dashboard (real), profile, notifications.

**Authorized mode:** fully autonomous (user-approved): per phase → branch → batches (sonnet implementer + review) → phase final review → PR → auto-merge → next. BLOCKED items: document honestly, skip, continue.

**Survey (all verified to follow the proven patterns — standard metadata pages, async-params `[id]` family, next/dynamic stragglers, no new Next constructs):**

| Phase | Section | Files / LOC | Special cases |
|---|---|---|---|
| 3 | inventory-management | 84 / 12.3k | nested params: `physical-count/[id]/entry`, `[id]/review`, `spot-check/[id]/review`, `spot-check/location/[location_id]`; `period-end/review` |
| 4 | vendor-management + (external) `pl/[url_token]` | 69+6 / ~12.6k | public route OUTSIDE ProtectedShell (own minimal layout — plain div); param `url_token`; uses `/api/external/*` (unauthenticated, http-client rewrite ready) |
| 5 | store-operation | 46 / 7.3k | standard (SR/wastage/stock-replenishment) |
| 6 | operation-plan | 84 / 10.1k | standard (category/cuisine/equipment/recipe + sub-config) |
| 7 | product-management | 35 / 6.3k | standard (product/category) |
| 8 | system-admin | 113 / 18.3k | biggest; `[id]`: notification-template, role, user, workflow; monaco editor (already a dep) |
| 9 | report + dashboard(real) + profile(+setting) + notifications | 51 / 11.5k | dashboard REPLACES the placeholder `routes/dashboard/page.tsx`; profile uses pre-copied `app/` leaf change-password-dialog |
| — | playground | skipped | dev-only fixtures; not part of the product (documented decision) |
| — | home (`/` HomeComponent) | skipped | `/` redirects to /dashboard per Phase 0 decision |

**Per-phase recipe (unchanged):** copy section → `next-to-vite.sh routes` → `nextpage-to-route.sh` on standard pages → hand-convert `[id]`-family pages with the `useParams` template (param names: `id`, `location_id`, `url_token` per route) → next/dynamic → lazy+Suspense → register lazy children under a section parent route + `RouteErrorBoundaryAdapter` (skip source `error.tsx`) → RHF dirtyFields casts where tsc demands (`// RHF 7.78 type drift`) → gates (tsc/lint/test/build) → authenticated probe (login ONCE) → commit (zebra-grep empty).

**Nested-params template** (e.g. physical-count/[id]/entry):

```tsx
import { useParams } from "react-router";
import { <ContentComponent> } from "./<content-file>";

export default function <Name>Page() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <<ContentComponent> id={id} />;
}
export const Component = <Name>Page;
```

(Adapt to each source page's actual content component + prop names — read the original first; some nested pages may take no params and just render a component: then the standard codemod applies.)

**(external) route registration (Phase 4):** as a SIBLING of ProtectedShell inside AppRoot children (public — NO RequireAuth):

```tsx
      { path: "/pl/:url_token", lazy: () => import("./external/pl/page") },
```

with the source files placed at `routes/external/pl/` (flattening `[url_token]` into the page via `useParams<{ url_token: string }>`).

**Phase 9 dashboard:** replace the placeholder content of `routes/dashboard/page.tsx` with the converted source dashboard page (import `./_components/dashboard-component` copied alongside); keep `export const Component`.

**Per-phase verification:** gates + probe of every new top route + e2e extension where it adds value (Phase 9: extend authenticated e2e to assert the REAL dashboard renders widgets container). Phase-final integration review must run the sidebar↔route coverage check for the section.

**Tasks:** one per phase (3,4,5,6,7,8,9) with batches sized ≤ ~60 files per implementer dispatch (split big sections in two: inventory A/B, system-admin A/B/C as needed).
