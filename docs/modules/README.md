# Modules

Per-section guide to `routes/`. Each section (except the standalone shells) is a
router parent with a `RouteErrorBoundaryAdapter`; pages live at
`routes/<section>/<leaf>/page.tsx` and export `const Component`. Reference module
sets: `routes/config/` and `routes/procurement/`.

For app-wide wiring (auth, http-client, routing, i18n, deploy) see
[`../architecture.md`](../architecture.md). Data hooks live in `hooks/` and call
endpoints from `constant/api-endpoints.ts` via `lib/http-client.ts`.

## config

Master/config data — units, currencies, tax profiles, departments, locations, credit terms, delivery points, ECO, extra costs, exchange rate.

| Route | Page |
|---|---|
| `(index)` | `routes/config/page.tsx` |
| `unit` | `routes/config/unit/page.tsx` |
| `currency` | `routes/config/currency/page.tsx` |
| `adjustment-type` | `routes/config/adjustment-type/page.tsx` |
| `business-type` | `routes/config/business-type/page.tsx` |
| `certification` | `routes/config/certification/page.tsx` |
| `credit-note-reason` | `routes/config/credit-note-reason/page.tsx` |
| `credit-term` | `routes/config/credit-term/page.tsx` |
| `delivery-point` | `routes/config/delivery-point/page.tsx` |
| `eco` | `routes/config/eco/page.tsx` |
| `exchange-rate` | `routes/config/exchange-rate/page.tsx` |
| `extra-cost` | `routes/config/extra-cost/page.tsx` |
| `tax-profile` | `routes/config/tax-profile/page.tsx` |
| `department` | `routes/config/department/page.tsx` |
| `department/new` | `routes/config/department/new/page.tsx` |
| `department/:id` | `routes/config/department/[id]/page.tsx` |
| `location` | `routes/config/location/page.tsx` |
| `location/new` | `routes/config/location/new/page.tsx` |
| `location/:id` | `routes/config/location/[id]/page.tsx` |

## procurement

Purchasing — purchase requests, purchase orders (incl. the from-price-list wizard), goods-receive notes, credit notes, request templates, approvals.

| Route | Page |
|---|---|
| `(index)` | `routes/procurement/page.tsx` |
| `purchase-request-template` | `routes/procurement/purchase-request-template/page.tsx` |
| `purchase-request-template/new` | `routes/procurement/purchase-request-template/new/page.tsx` |
| `purchase-request-template/:id` | `routes/procurement/purchase-request-template/[id]/page.tsx` |
| `credit-note` | `routes/procurement/credit-note/page.tsx` |
| `credit-note/new` | `routes/procurement/credit-note/new/page.tsx` |
| `credit-note/:id` | `routes/procurement/credit-note/[id]/page.tsx` |
| `goods-receive-note` | `routes/procurement/goods-receive-note/page.tsx` |
| `goods-receive-note/new` | `routes/procurement/goods-receive-note/new/page.tsx` |
| `goods-receive-note/:id` | `routes/procurement/goods-receive-note/[id]/page.tsx` |
| `purchase-order` | `routes/procurement/purchase-order/page.tsx` |
| `purchase-order/new` | `routes/procurement/purchase-order/new/page.tsx` |
| `purchase-order/from-price-list` | `routes/procurement/purchase-order/from-price-list/page.tsx` |
| `purchase-order/:id` | `routes/procurement/purchase-order/[id]/page.tsx` |
| `purchase-request` | `routes/procurement/purchase-request/page.tsx` |
| `purchase-request/new` | `routes/procurement/purchase-request/new/page.tsx` |
| `purchase-request/:id` | `routes/procurement/purchase-request/[id]/page.tsx` |
| `approval` | `routes/procurement/approval/page.tsx` |

## inventory-management

Stock control — inventory adjustments, spot checks, physical counts, stock cards and balances.

| Route | Page |
|---|---|
| `(index)` | `routes/inventory-management/page.tsx` |
| `inventory-adjustment` | `routes/inventory-management/inventory-adjustment/page.tsx` |
| `inventory-adjustment/new` | `routes/inventory-management/inventory-adjustment/new/page.tsx` |
| `inventory-adjustment/:id` | `routes/inventory-management/inventory-adjustment/[id]/page.tsx` |
| `transaction` | `routes/inventory-management/transaction/page.tsx` |
| `physical-count` | `routes/inventory-management/physical-count/page.tsx` |
| `physical-count/new` | `routes/inventory-management/physical-count/new/page.tsx` |
| `physical-count/:id` | `routes/inventory-management/physical-count/[id]/page.tsx` |
| `physical-count/:id/entry` | `routes/inventory-management/physical-count/[id]/entry/page.tsx` |
| `physical-count/:id/review` | `routes/inventory-management/physical-count/[id]/review/page.tsx` |
| `spot-check` | `routes/inventory-management/spot-check/page.tsx` |
| `spot-check/location/:location_id` | `routes/inventory-management/spot-check/location/[location_id]/page.tsx` |
| `spot-check/:id` | `routes/inventory-management/spot-check/[id]/page.tsx` |
| `spot-check/:id/review` | `routes/inventory-management/spot-check/[id]/review/page.tsx` |
| `period-end` | `routes/inventory-management/period-end/page.tsx` |
| `period-end/review` | `routes/inventory-management/period-end/review/page.tsx` |

## vendor-management

Vendors and pricing — vendor master, price lists, price-list templates, request-for-pricing (RFP).

| Route | Page |
|---|---|
| `(index)` | `routes/vendor-management/page.tsx` |
| `vendor` | `routes/vendor-management/vendor/page.tsx` |
| `vendor/new` | `routes/vendor-management/vendor/new/page.tsx` |
| `vendor/:id` | `routes/vendor-management/vendor/[id]/page.tsx` |
| `price-list` | `routes/vendor-management/price-list/page.tsx` |
| `price-list/new` | `routes/vendor-management/price-list/new/page.tsx` |
| `price-list/:id` | `routes/vendor-management/price-list/[id]/page.tsx` |
| `price-list-template` | `routes/vendor-management/price-list-template/page.tsx` |
| `price-list-template/new` | `routes/vendor-management/price-list-template/new/page.tsx` |
| `price-list-template/:id` | `routes/vendor-management/price-list-template/[id]/page.tsx` |
| `request-price-list` | `routes/vendor-management/request-price-list/page.tsx` |
| `request-price-list/new` | `routes/vendor-management/request-price-list/new/page.tsx` |
| `request-price-list/:id` | `routes/vendor-management/request-price-list/[id]/page.tsx` |

## store-operation

Store-level operations — store requisitions, wastage reports, stock replenishment.

| Route | Page |
|---|---|
| `(index)` | `routes/store-operation/page.tsx` |
| `store-requisition` | `routes/store-operation/store-requisition/page.tsx` |
| `store-requisition/new` | `routes/store-operation/store-requisition/new/page.tsx` |
| `store-requisition/:id` | `routes/store-operation/store-requisition/[id]/page.tsx` |
| `wastage-reporting` | `routes/store-operation/wastage-reporting/page.tsx` |
| `wastage-reporting/new` | `routes/store-operation/wastage-reporting/new/page.tsx` |
| `wastage-reporting/:id` | `routes/store-operation/wastage-reporting/[id]/page.tsx` |
| `stock-replenishment` | `routes/store-operation/stock-replenishment/page.tsx` |

## operation-plan

F&B planning — recipes, recipe categories, cuisines, equipment.

| Route | Page |
|---|---|
| `(index)` | `routes/operation-plan/page.tsx` |
| `category` | `routes/operation-plan/category/page.tsx` |
| `category/new` | `routes/operation-plan/category/new/page.tsx` |
| `category/:id` | `routes/operation-plan/category/[id]/page.tsx` |
| `cuisine` | `routes/operation-plan/cuisine/page.tsx` |
| `cuisine/new` | `routes/operation-plan/cuisine/new/page.tsx` |
| `cuisine/:id` | `routes/operation-plan/cuisine/[id]/page.tsx` |
| `recipe` | `routes/operation-plan/recipe/page.tsx` |
| `recipe/new` | `routes/operation-plan/recipe/new/page.tsx` |
| `recipe/:id` | `routes/operation-plan/recipe/[id]/page.tsx` |
| `equipment` | `routes/operation-plan/equipment/page.tsx` |
| `equipment/new` | `routes/operation-plan/equipment/new/page.tsx` |
| `equipment/:id` | `routes/operation-plan/equipment/[id]/page.tsx` |
| `recipe-equipment-category` | `routes/operation-plan/recipe-equipment-category/page.tsx` |
| `equipment-category` | `routes/operation-plan/equipment-category/page.tsx` |

## product-management

Product master — products, categories, sub-categories, item groups.

| Route | Page |
|---|---|
| `(index)` | `routes/product-management/page.tsx` |
| `category` | `routes/product-management/category/page.tsx` |
| `product` | `routes/product-management/product/page.tsx` |
| `product/new` | `routes/product-management/product/new/page.tsx` |
| `product/:id` | `routes/product-management/product/[id]/page.tsx` |

## system-admin

Administration — users, roles, workflows, periods, running codes, activity/audit logs, documents.

| Route | Page |
|---|---|
| `(index)` | `routes/system-admin/page.tsx` |
| `role` | `routes/system-admin/role/page.tsx` |
| `role/new` | `routes/system-admin/role/new/page.tsx` |
| `role/:id` | `routes/system-admin/role/[id]/page.tsx` |
| `notification-template` | `routes/system-admin/notification-template/page.tsx` |
| `notification-template/new` | `routes/system-admin/notification-template/new/page.tsx` |
| `notification-template/:id` | `routes/system-admin/notification-template/[id]/page.tsx` |
| `period` | `routes/system-admin/period/page.tsx` |
| `user-activity` | `routes/system-admin/user-activity/page.tsx` |
| `user` | `routes/system-admin/user/page.tsx` |
| `user/:id` | `routes/system-admin/user/[id]/page.tsx` |
| `document` | `routes/system-admin/document/page.tsx` |
| `query-dataset` | `routes/system-admin/query-dataset/page.tsx` |
| `activity-log` | `routes/system-admin/activity-log/page.tsx` |
| `workflow` | `routes/system-admin/workflow/page.tsx` |
| `workflow/new` | `routes/system-admin/workflow/new/page.tsx` |
| `workflow/:id` | `routes/system-admin/workflow/[id]/page.tsx` |
| `running-code` | `routes/system-admin/running-code/page.tsx` |
| `config-email` | `routes/system-admin/config-email/page.tsx` |
| `dashboard-dataset` | `routes/system-admin/dashboard-dataset/page.tsx` |

## report

Reporting — report list and parameterized report runner.

| Route | Page |
|---|---|
| `(index)` | `routes/report/page.tsx` |
| `list` | `routes/report/list/page.tsx` |
| `schedules` | `routes/report/schedules/page.tsx` |
| `history` | `routes/report/history/page.tsx` |

## dashboard

Landing dashboard with configurable saved widgets.

| Route | Page |
|---|---|
| `dashboard` | `routes/dashboard/page.tsx` |

## profile

Current-user profile, business-unit switch, password change, settings.

| Route | Page |
|---|---|
| `profile` | `routes/profile/page.tsx` |
| `profile/setting` | `routes/profile/setting/page.tsx` |

## notifications

Notification center.

| Route | Page |
|---|---|
| `notifications` | `routes/notifications/page.tsx` |

## external

Public, unauthenticated price-list view via /pl/:url_token.

| Route | Page |
|---|---|
| `/pl/:url_token` | `routes/external/pl/page.tsx` |
