# Phase 2 — Procurement Modules Migration

**Date:** 2026-06-11
**Status:** Design pending user review
**Depends on:** Phase 0 + Phase 1 (merged to `main` via PR #1)
**Source:** `../carmen-inventory-frontend/app/(root)/procurement/` — 157 files, ~28.6k LOC
**Branch:** `phase2-procurement`

---

## 1. Goal & Scope

Migrate the entire `procurement/*` section using the recipe proven in Phase 1 (CLAUDE.md "Migrating a module"). Pattern survey of the source found **zero new Next constructs** — the section uses exactly the transforms the codemods + reference conversions already handle:

| Pattern | Count | Handler |
|---|---|---|
| `next-intl` imports | 98 | `next-to-vite.sh` |
| `Metadata` + `next-intl/server` + `generateMetadata` | 18 pages | `nextpage-to-route.sh` |
| `next/navigation` / `next/link` | 16 / 3 | `next-to-vite.sh` → compat layer |
| `next/dynamic` | 10 files | `lazy()` + `<Suspense fallback={null}>` (reference: currency-component) |
| `[id]/page.tsx` async-params | 5 pages | hand-convert to `useParams` (reference: department `[id]/page.tsx`) |
| `searchParams` page props / new constructs | 0 | — |

### Modules (migration order: smallest → largest, ramping risk)

| Batch | Module | Files / LOC | Routes |
|---|---|---|---|
| A | landing + **purchase-request-template** (PRT) | 1 + 12 / ~1.7k | `/procurement`, `prt` list + `new` + `:id` |
| B | **credit-note** (CN) | 17 / ~3.2k | list + `new` + `:id` |
| C | **goods-receive-note** (GRN) | 25 / ~5.4k | list + `new` + `:id` |
| D | **purchase-order** (PO) | 45 / ~8.5k | list + `new` + `:id` + `from-price-list` |
| E | **purchase-request** (PR) | 52 / ~9.4k | list + `new` + `:id` |
| F | **approval** + e2e extension + docs | 3 / ~0.3k | `approval` |

Every batch ends with full gates (tsc/lint/tests/build) + an authenticated browser probe against the local gateway (:4000, admin account, env-only credentials).

### Out of scope

- Other sections (inventory-management, vendor-management, …) — later phases.
- Backend gaps surfaced by probes (document as open items, don't fix frontend-side).

## 2. Architecture (unchanged from Phase 1)

- Copy verbatim → `next-to-vite.sh` → `nextpage-to-route.sh` → hand-convert `[id]` pages → register lazy children under a `procurement` parent route with the existing `RouteErrorBoundaryAdapter`.
- Folder names kept identical (incl. `[id]`); router paths declared as `:id`.
- Router registration shape:

```tsx
{
  path: "procurement",
  ErrorBoundary: RouteErrorBoundaryAdapter,
  children: [
    { index: true, lazy: () => import("./procurement/page") },
    { path: "purchase-request-template", ... }, // + /new + /:id
    { path: "credit-note", ... },               // + /new + /:id
    { path: "goods-receive-note", ... },        // + /new + /:id
    { path: "purchase-order", ... },            // + /new + /:id + /from-price-list
    { path: "purchase-request", ... },          // + /new + /:id
    { path: "approval", ... },
  ],
}
```

## 3. Known risks (vs config phase)

1. **Workflow/approval flows** — PR/PO documents carry workflow state; hooks (`use-approval`, `use-purchase-request`, `use-workflow`) were ported in Phase 0 and use `/api/proxy/*` (works). Probes must exercise a document detail page to confirm.
2. **Cross-section imports** — procurement components may import from not-yet-migrated sections (e.g. vendor lookups → `components/lookup/*` are ported; route-level imports would fail tsc). The tsc gate catches these; resolution rule: if the import target is a self-contained leaf, copy it to its source path (Phase 0 `app/` leaf-file precedent); otherwise escalate.
3. **Print/export features** — `print-document`, xlsx export hooks are ported; probes should not exercise printing (browser-level), just confirm pages render.

## 4. Verification

- Per batch: gates + authenticated probe (login once per probe run — backend rate limit).
- Phase-end: extend `e2e/authenticated-config.spec.ts` family with `e2e/authenticated-procurement.spec.ts` (same env-gated project): login → PRT list renders ≥1 row or empty-state → PR list → PO list → one detail page (`:id`) loads real document data.
- Acceptance: all 18 procurement routes reachable; sidebar `/procurement/*` links ↔ router entries 100% matched (Phase 1 final-review technique); detail pages load real backend data; all gates green; no credentials in git.

## 5. Decisions log

- Same-recipe migration, no architectural changes.
- Batch order smallest→largest (PRT proves the document-pattern cheaply before PR/PO).
- Approval module last (depends on PR detail rendering for approve actions).
