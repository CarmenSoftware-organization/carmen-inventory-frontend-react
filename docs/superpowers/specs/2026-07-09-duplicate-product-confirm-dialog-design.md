# Duplicate Product Confirm Dialog — Design

**Date:** 2026-07-09
**Status:** Approved (design)

## Problem

Product tables (price list, price-list template, and later many other item
tables) allow the same product to be selected in more than one row. Selecting a
product that already exists elsewhere in the list is often a mistake. We want a
reusable confirmation step: when a user picks a product that duplicates another
row, show a confirm dialog. Confirm keeps the duplicate; Cancel reverts to the
row's previous value.

This is a deliberate follow-up to removing the `excludeIds` duplicate-prevention
(which hid duplicates entirely) — we now *allow* duplicates but *confirm* them.

## Goals

- A **global, reusable** duplicate-product confirm dialog + hook, matching the
  existing `useDiscardConfirm` / `DiscardDialog` family pattern.
- Wire it into **price-list** (`pl-product-*`) and **price-list-template**
  (`plt-product-*`) product tables now. plt allows the same product across MOQ
  tiers by design, so there the dialog acts as a "did you mean to add another
  tier?" guard — same behaviour, still confirm.
- Cancel reverts (no change applied); Confirm applies the selection.

## Non-goals

- Wiring the other product tables (PO, GRN, CN, PR, PRT, SR, wastage). The
  primitive is built to be dropped in there later, but that is out of scope.
- Preventing duplicates / restoring `excludeIds`.

## Approach A (chosen)

Mirror the existing imperative confirm pattern (`hooks/use-discard-confirm.ts` +
`components/ui/discard-dialog.tsx`).

### 1. Hook — `hooks/use-duplicate-product-confirm.ts`

```ts
export interface DuplicateProductDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  readonly productName?: string;
}

export function useDuplicateProductConfirm(): {
  // If a caller detected a duplicate, it calls confirm(action, name):
  // opens the dialog, runs `action` on confirm, does nothing on cancel.
  confirm: (action: () => void, productName?: string) => void;
  dialogProps: DuplicateProductDialogProps;
};
```

Internal state: `open`, `pendingAction`, `productName` (mirrors
`useDiscardConfirm` exactly). No `isDirty`/`beforeunload` machinery.

### 2. Dialog — `components/ui/duplicate-product-dialog.tsx`

Presentational wrapper over `AlertDialog` (same shape as `DeleteDialog`/
`ConfirmDialog`). Default i18n title/description from a new `duplicateProduct`
namespace, with `{name}` interpolation when `productName` is given. Buttons:
Confirm (default variant, "add anyway") and Cancel. Renders once per table.

### 3. Detection — at `ProductCell` (both pl and plt)

`ProductCell` already has `form` + `index`. On product select:

```tsx
onValueChange={(id, product) => {
  const rows = form.getValues(<detailArrayName>); // "pricelist_detail" | "details"
  const isDup = !!id && rows.some((r, i) => i !== index && r.product_id === id);
  if (isDup) confirmDuplicate(() => field.onChange(id), product?.name);
  else field.onChange(id);
}}
```

`<detailArrayName>` is `"pricelist_detail"` for pl and `"details"` for plt.
plt's `ProductCell` also keeps its existing `unit_name` side effects — those run
inside the applied `action` where relevant (plt sets unit via `UnitCell`, so the
product action is just `field.onChange(id)`; no extra side effect needed here).

### 4. Wiring

- Instantiate `const dup = useDuplicateProductConfirm()` in the **table**
  component (`pl-product-table.tsx`, `plt-product-table.tsx`).
- Render `<DuplicateProductDialog {...dup.dialogProps} />` once in the table.
- Pass `dup.confirm` into `buildPlProductColumns` / `buildPltProductColumns`
  (new `confirmDuplicate` option) → forwarded to `ProductCell` via cell props.

### 5. Revert semantics

Cancel = never call `field.onChange`, so the Controller stays on the previous
`field.value` and the controlled `LookupCombobox` re-renders the old product.
No previous-value bookkeeping needed.

### 6. i18n

Add a `duplicateProduct` namespace to `messages/en.json` and `messages/th.json`:
`title`, `description` (`"{name}" is already in this list. Add it again?` /
Thai equivalent), `confirm` (e.g. "Add anyway"). Reuse `common.cancel`.

## Rejected alternatives

- **B — Context provider** around the form: more "global" but a context for one
  dialog is overkill and diverges from the established hook pattern.
- **C — component-only** (no hook): each call site manages open/pending state →
  repeated boilerplate.

## Testing

- Unit test the hook (`use-duplicate-product-confirm.test.ts`): confirm runs the
  action; cancel does not; state resets.
- Manual/browser verify in pl + plt: select a duplicate → dialog appears;
  Confirm applies, Cancel reverts; non-duplicate applies with no dialog.

## Files

New:
- `hooks/use-duplicate-product-confirm.ts`
- `components/ui/duplicate-product-dialog.tsx`
- `hooks/use-duplicate-product-confirm.test.ts`

Changed:
- `routes/vendor-management/price-list/pl-product-table.tsx`, `pl-product-columns.tsx`, `pl-product-cells.tsx`
- `routes/vendor-management/price-list-template/plt-product-table.tsx`, `plt-product-columns.tsx`, `plt-product-cells.tsx`
- `messages/en.json`, `messages/th.json`
