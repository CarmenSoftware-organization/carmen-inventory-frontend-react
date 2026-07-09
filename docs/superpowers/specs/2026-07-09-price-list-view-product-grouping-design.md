# Price List — Group Duplicate Products in View Mode

**Date:** 2026-07-09
**Status:** Approved (design)
**Scope:** `routes/vendor-management/price-list/` only (NOT price-list-template)

## Problem

A price list can hold the same product in multiple rows (MOQ tiers / price
breaks). In **view mode** this reads as repeated product names. We want same-
product rows grouped: the product name shows once, its tiers listed beneath it.

## Decisions (from brainstorming)

- **View mode only.** Edit/add stay flat, one row per detail — untouched.
- **rowspan-style grouping:** product name once per group; tiers as sub-rows.
- Tiers sorted **by MOQ ascending** within a group; groups in first-appearance
  order.
- Group key = `product_id`.

## Non-goals

- No change to edit/add, `getRowId`, or the duplicate-confirm dialog (all
  non-view paths).
- Not applied to price-list-template.

## Approach

View mode is read-only, and `detailRefs` (`PriceList["pricelist_detail"]`)
already carries every display field (`product_name`, `product_local_name`,
`unit_name`, `moq_qty`, `price_without_tax`, `tax_profile_name`,
`lead_time_days`). So the grouped view is driven purely by `detailRefs` — no
form/field-array involvement.

### Component split

`PLProductTable` becomes a thin dispatcher (no hooks of its own):

```tsx
export function PLProductTable(props) {
  if (props.isView)
    return <PLProductGroupedView detailRefs={props.detailRefs ?? []} tfl={props.tfl} />;
  return <PLProductEditTable {...props} />;
}
```

- `PLProductEditTable` — the current editable implementation moved verbatim
  (dupConfirm hook, `buildPlProductColumns`, DataGrid, `DuplicateProductDialog`).
  No behaviour change.
- `PLProductGroupedView` — new file `pl-product-grouped-view.tsx`, own
  `useReactTable` + DataGrid for consistent styling.

Splitting into two children keeps hooks unconditional inside each (no
rules-of-hooks issue) and leaves the editable path byte-for-byte the same.

### Grouping (in `PLProductGroupedView`)

1. Group `detailRefs` by `product_id`, preserving first-appearance order.
2. Sort each group's tiers by `moq_qty` ascending.
3. Flatten to view rows carrying meta: `{ ref, groupNumber, isFirstInGroup,
   isLastInGroup }`.

### Columns (read-only)

| Column | first tier | later tiers |
| --- | --- | --- |
| `#` | `groupNumber` | empty |
| Product | `NameWithSubtext` (name + local name) | muted tree connector (`└` last / `│` otherwise) |
| Unit | `unit_name` (plain) | same, per tier |
| MOQ | `{moq_qty}+` | per tier |
| Unit Price | `price_without_tax.toFixed(2)` | per tier |
| Tax Profile | `tax_profile_name` (plain) | per tier |
| Lead Time | `{lead_time_days}d` | per tier |

No actions column. Header labels via the existing `tfl` keys
(`product`/`unit`/`moq`/`unitPrice`/`taxProfile`/`leadTime`). Plain-text
renderers match the existing view-mode cell styles (reuse `NameWithSubtext` /
`FieldPlainText`; small inline spans for the number formats).

## Testing

- Manual/browser verify in price-list view mode: same product across tiers shows
  the name once with tiers (ascending MOQ) beneath; distinct products render as
  single rows; edit mode still flat and editable.
- `tsc` + `eslint` clean.

## Files

New: `routes/vendor-management/price-list/pl-product-grouped-view.tsx`
Changed: `routes/vendor-management/price-list/pl-product-table.tsx` (split into
dispatcher + `PLProductEditTable`).
