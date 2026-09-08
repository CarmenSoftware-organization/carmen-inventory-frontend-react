# Accounting launcher navigation

## Goal

The nine-dot application launcher no longer shows one `Accounting` tile. It shows four Accounting modules instead. Selecting one of these modules navigates to its dashboard and changes the sidebar to only that module's pages.

## Navigation map

| Nine-dot launcher module | Default route                     | Sidebar pages                                                                       |
| ------------------------ | --------------------------------- | ----------------------------------------------------------------------------------- |
| General Ledger           | `/accounting`                     | Dashboard, Journal Voucher, Template Voucher, Recurring Voucher, Allocation Voucher |
| Accounts Payable         | `/accounting/accounts-payable`    | Dashboard, Invoice, Payment                                                         |
| Accounts Receivable      | `/accounting/accounts-receivable` | Dashboard, Invoice, Receipt                                                         |
| Asset                    | `/accounting/asset`               | Dashboard, Register, Disposal                                                       |

### General Ledger

- Dashboard: `/accounting`
- Journal Voucher: `/accounting/journal-voucher`
- Template Voucher: `/accounting/template-voucher`
- Recurring Voucher: `/accounting/recurring-voucher`
- Allocation Voucher: `/accounting/allocation-voucher`

### Accounts Payable

- Dashboard: `/accounting/accounts-payable`
- Invoice: `/accounting/accounts-payable/invoice`
- Payment: `/accounting/accounts-payable/payment`

### Accounts Receivable

- Dashboard: `/accounting/accounts-receivable`
- Invoice: `/accounting/accounts-receivable/invoice`
- Receipt: `/accounting/accounts-receivable/receipt`

### Asset

- Dashboard: `/accounting/asset`
- Register: `/accounting/asset/register`
- Disposal: `/accounting/asset/disposal`

## Behavior

- The launcher retains the existing three-column tile grid, keyboard shortcut, permission handling, and license handling.
- The Accounting parent remains in the internal module tree for route guarding and grouping, but it is expanded into four tiles only when rendered in the nine-dot launcher.
- Deep links select the correct Accounting group from the pathname and show only that group's sidebar pages.
- Breadcrumbs start from the selected Accounting module (for example, `Accounts Payable > Invoice`) and do not expose the internal Accounting parent or duplicate dashboard labels.
- Desktop and mobile use the same nine-dot launcher; no permanent Accounting module tabs are added to the topbar.

## Implementation sources

- Module tree and route matching: `constant/module-list.ts`
- Nine-dot launcher expansion: `components/navbar/module-app.tsx`
- Contextual sidebar: `components/sidebar/side-main.tsx`
- Routes: `routes/router.tsx`
