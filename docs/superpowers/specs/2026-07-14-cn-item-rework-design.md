# CN (Credit Note) item rework — design

Date: 2026-07-14 · Module: `routes/procurement/credit-note/`

## Goal (from 2026-07-09 requirement list)

Rework the CN item table so behaviour follows the credit-note type, and replace
the inline product picker with a browse dialog.

| Field | `quantity_return` | `amount_discount` |
|---|---|---|
| Price | 🔒 locked (from GRN) | 🔒 locked (from GRN) |
| Qty | ✏️ editable | 🔒 locked (ref) |
| Subtotal / CN amount (`net_amount`) | Subtotal read-only (`qty×price`) | ✏️ "CN Amount", entered directly |
| Discount | ✏️ editable (rate% + amount override) | — (n/a; CN amount is the credit) |
| Tax | ✏️ editable (tax profile + amount override, GRN/PO style) | ✏️ editable (tax profile + amount override) |

**Update (2026-07-14, follow-up):** the Discount and Tax columns now use the shared
`components/procurement/discount-tax-override` controls (`DiscountOverrideInput`,
`TaxOverrideInput`, `OverrideToggle`) — same as GRN/PO. Discount is per-line and
editable only for `quantity_return` (for `amount_discount` the entered CN amount is
itself the credit, so the discount column shows "—"). Tax is the full GRN/PO combo:
tax-profile lookup (changes the rate) + amount override — no longer rate-locked.

## Decisions (approved)

1. **Add item → browse dialog.** Replace the inline `LookupGrnProduct` in the row
   with an "Add item" dialog that lists the selected GRN's received lines
   (product + location) with checkboxes for multi-select. On confirm, prepend one
   CN row per selected line, **pre-filled from the GRN**: product, location, unit,
   qty, unit_price, tax_rate. Data source: `useGoodsReceiveNoteById(grnId)` →
   `good_received_note_detail[]` (product+location group) → `items[]`
   (`received_qty`, `received_unit_*`, `sub_total_price`, `tax_rate`).
   `unit_price = round2(sub_total_price / received_qty)` (same as GRN form).
   Exclude product+location combos already in the item list.

2. **"CN amount" = `net_amount`.** No new schema field. Presentation switches by type:
   - `quantity_return` → `net_amount` computed `qty × price`, shown read-only as
     "Subtotal"; no CN-amount input.
   - `amount_discount` → single editable "CN Amount" column writing `net_amount`
     directly; qty/price are read-only reference.

3. **Tax.** Lock `tax_rate` (plain text). Make `tax_amount` an editable input; on
   edit set `is_tax_adjustment = true`. Default `tax_amount = net × rate/100` while
   `is_tax_adjustment` is false (mirrors PR pattern).

## Consequences on the row

Since product/location/unit/price/tax_rate are all pre-filled from the GRN via the
dialog, the row no longer needs inline lookups. Product, location, unit, price and
tax-rate cells become **read-only display**. Only qty (quantity_return),
CN amount (amount_discount), and tax amount (both) are inputs.

## Compute (extract + unit-test)

Pure helper `computeCnItemAmounts(type, item)` → `{ sub_total, discount_amount,
net_amount, tax_amount, total_amount }`:
- `quantity_return` → delegates to the shared `lib/line-pricing` `computeLineAmounts`
  (`subtotal = qty×price` → discount rate/override → `net = subtotal − discount` →
  tax rate/override → `total`).
- `amount_discount` → `net = round2(item.net_amount)` (entered), `discount = 0`,
  `sub_total = net`, tax rate/override, `total = net + tax`.

`CnItemComputedSync` calls it and only writes fields whose derived value differs,
never overwriting a user-entered `net_amount` (amount_discount), `discount_amount`
(adjustment on) or `tax_amount` (adjustment on). It also self-heals a type switch:
in `amount_discount` it forces `is_discount_adjustment = false` and
`discount_amount = 0` so a discount override left over from `quantity_return` can't
leak into the totals/payload.

## Out of scope

GRN "move price to product row" (deferred by user). Tax-rate override via the
tax-profile lookup is now **in scope** (follow-up above). Backend payload now also
carries `discount_rate`/`discount_amount`/`is_discount_adjustment` and (conditionally)
`tax_profile_id` per line (`mapItemToPayload`); the backend CN detail already accepts
these fields.
