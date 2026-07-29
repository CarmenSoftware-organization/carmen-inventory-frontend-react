---
name: migrate-source-module
description: Use when porting or updating a module from the source Next.js app (../carmen-inventory-frontend) into this Vite + React Router SPA — the colocated-route convention and the Next→react-router rewrite steps.
---

# Migrating a module from the source app

All sections are already ported **and colocated**. For a new/updated module, follow the
colocated convention (the `scripts/codemods/*` helpers predate the compat removal and still
rewrite to `lib/compat/*` — don't rely on them for the import step):

1. Copy the module's components, hooks and types from `../carmen-inventory-frontend` into
   `routes/<module>/<feature>/` — flat, no `_components/` wrapper.
2. Rewrite Next APIs to react-router directly (see "Imports" in the root `CLAUDE.md`):
   `next/link`→`Link` (`to`), `next/navigation`→`useNavigate`/`useLocation`/`useParams`/`useSearchParams`,
   `next-intl`→`use-intl`. `next/dynamic` → `lazy()` + `<Suspense fallback={null}>` (see
   `routes/config/currency/currency-component.tsx`). Drop no-op `router.refresh()` calls
   (data comes from TanStack Query invalidation).
3. Name each route file `<feature>.route.tsx` exporting `Component`. Dynamic routes use
   `useParams` + native `:id` (see `routes/config/department/department-edit.route.tsx`).
4. Register routes in `routes/router.tsx` with `lazy: () => import("./<...>.route")`, under
   the module's section parent (which carries `RouteErrorBoundaryAdapter`).
5. `bunx tsc --noEmit && bun test:run` must be clean.
