# Product list — sortable columns

**Date:** 2026-07-14
**Route:** `/product-management/product`
**Status:** Approved, ready for plan

## Goal

Let users sort the product list by clicking column headers. Sorting is
server-side (the list is server-paginated, `manualSorting: true`), so each
column only becomes sortable if the backend accepts its sort field.

## Backend verification (done)

Probed the live gateway (`http://localhost:4000`, BU `T02`, 2593 products)
via `GET /api/config/T02/products?sort=<field>:<dir>`:

| Requested column | sort field probed | Backend result |
|---|---|---|
| Code | `code` | ✅ 200, sorted |
| Name | `name` | ✅ 200, sorted (already enabled) |
| Local name | `local_name` | ✅ 200, sorted |
| Unit | `inventory_unit_name` | ✅ 200, sorted (BAG ↔ UNIT) |
| Status | `product_status_type` | ✅ 200, accepted (enum active/inactive) |
| Category | `product_category_name`, `product_category_id` | ❌ 400 `Unknown argument` |
| Sub category | `product_sub_category_name`, `product_sub_category_id` | ❌ 400 `Unknown argument` |
| Item group | `product_item_group_name` | ❌ 400 · `product_item_group_id` → 200 but sorts by FK id, not name |

**Decision:** enable sort only on the five backend-supported columns
(`code`, `name`, `local_name`, `inventory_unit_name`, `product_status_type`).
Category / sub category / item group stay non-sortable until the backend adds
relation-name sort. `product_item_group_id` sorting is rejected — it groups by
FK id, not by group name, which is misleading UX.

Backend follow-up (out of scope): add `product_category_name`,
`product_sub_category_name`, `product_item_group_name` to the product list
`orderBy` whitelist so all seven columns can sort by name.

## Scope

Single file: `routes/product-management/product/use-product-table.tsx`.

Remove `enableSorting: false` from four column defs:

- `code` (accessorKey `code`)
- `local_name` (accessorKey `local_name`)
- `inventory_unit_name` (accessorKey `inventory_unit_name`)
- `product_status_type` (id/accessorKey `product_status_type`)

`name` is already sortable (no flag). Keep `enableSorting: false` on
`product_category_name`, `product_sub_category_name`, `product_item_group_name`.
`select` / `index` / `action` columns already opt out of sorting via their
shared column helpers — untouched.

## Behavior (all from existing infra — no changes)

- Click a sortable header cycles none → asc → desc → clear
  (`DataGridColumnHeader.handleSort`).
- Changing sort resets to page 1 (`useDataGridState.onSortingChange`).
- Sort persists in the URL `sort` param; it also carries into grid/card mode
  because `combinedParams` already includes `params.sort`. No grid-mode UI change.
- No default sort — first load keeps the backend's default order.

## Data flow (unchanged)

```
header click → onSortingChange → setSort("field:dir") → URL ?sort=
  → params.sort → useProduct(combinedParams) → GET ...?sort=field:dir → backend
```

## Testing

Add `routes/product-management/product/use-product-table.test.tsx`:

- Render `useProductTable` (via `renderHook`) with the i18n provider and minimal
  props.
- Assert `table.getColumn(id)?.getCanSort()`:
  - `true` for `code`, `name`, `local_name`, `inventory_unit_name`,
    `product_status_type`.
  - `false` for `product_category_name`, `product_sub_category_name`,
    `product_item_group_name`.

This locks the contract so no one re-enables sort on a column the backend
rejects (which would surface as a 400 to users).

Follow existing test setup for hooks that call `useTranslations` (i18n provider
wrapper). `bunx tsc --noEmit && bun test:run` must be clean.

## Non-goals

- No backend changes.
- No default sort.
- No sort UI in grid/card mode (sort still carries via URL).
- Category / sub category / item group remain non-sortable.
