# ListPageShell — โครงหน้า list เดียวกันทั้งแอป

## 0. การตัดสินใจ (กับ user 2026-10-01)

สำรวจ 146 route (ไม่นับ design-system / auth / legal / not-found) พบว่าหน้า list 64 หน้าใช้หัว 4 แบบ
ทั้งที่ของกลางมีครบแล้ว (`ConfigListTemplate` · `DocumentListHeader` · `DocumentListActions` ·
`ListToolbar`) — 29 หน้าก๊อป wrapper + บล็อก sticky ของ `ConfigListTemplate` มาบรรทัดต่อบรรทัด
อีก 10 หน้าไม่ sticky / full-bleed · 7 หน้าใช้ `DisplayTemplate` ที่ไม่มีไอคอนโมดูล ไม่มี badge นับ ·
3 หน้าเขียน `<h1>` + ปุ่มสด

**ขอบเขตที่เลือก:** หน้า list ทั้งหมดก่อน (form / landing เป็นงานถัดไป คนละ spec)

**แนวทางที่เลือก (A):** สกัด "โครง" ออกจาก `ConfigListTemplate` เป็น `ListPageShell` แล้วให้ทุกหน้า
list เรียกใช้ รวม `ConfigListTemplate` เอง · ไม่เอาแนว B (ขยาย CLT ให้รองรับหน้าเอกสาร → god
component เพราะ CLT ถือ data fetching / dialog / delete flow ของ config entity) และไม่เอาแนว C
(ไล่แก้ class ทีละหน้า = สภาพปัจจุบันที่ drift กลับมาทันที)

**หน้าที่ต่างลึกกว่า header ทำแค่ header + โครง:**

- accounting 5 หน้า (ap-invoice / ap-payment / ar-invoice / accounting-document / journal-voucher)
  มีข้อความอังกฤษ hardcode + filter hook ของตัวเอง → ใช้ shell แล้วยัด toolbar เดิมลง slot
  **ไม่แตะ i18n ไม่แตะ filter** (งานแยก)
- physical-count / spot-check / transaction เป็น full-bleed `-mx-3 -my-3` ผ่าน `InvListShell` →
  **เลิก full-bleed** วางบน padding ของ `root-layout` เหมือนทุกหน้า คง card layout ใน body

## 1. สภาพปัจจุบัน (ตรวจ 2026-10-01)

`routes/root-layout.tsx` ให้ `#main-content` = `m-3 px-4 flex flex-col gap-4 overflow-auto` และ
navbar มี breadcrumb กลางแล้ว หน้าใดไม่ต้องวาด breadcrumb หรือ padding นอกเอง

| หัวหน้า list | จำนวน | หมายเหตุ |
|---|---|---|
| `ConfigListTemplate` | 15 | 13 config + eco + certification — ของกลางตัวจริง |
| `DocumentListHeader` ประกอบเอง | 40 | 29 ก๊อป wrapper sticky ของ CLT · 10 ไม่ sticky หรือ full-bleed · ia-component นับรวม |
| `DisplayTemplate` | 7 | ไม่มีไอคอน ไม่มี count ไม่ sticky · description `text-sm` (DLH ใช้ `text-xs sm:text-sm`) |
| `<h1>` เขียนสด | 3 | email-profile · email-template · interface |

ความไม่สอดคล้องรอง (แก้ไปพร้อมกัน):

- ปุ่ม Add: `DocumentListActions` 11 หน้า · `<Plus>` Button สด ~18 หน้า · ที่เหลือไม่มี
- สวิตช์ list/grid (`LayoutList`/`LayoutGrid`) เป็นมาร์กอัปสดใน `ListToolbar` และอีก ~9 หน้า
  (CLT · ap-invoice · ap-payment · accounting-document · journal-voucher · exchange-rate · rfp ·
  history · report-list) — `ViewModeToggle` คนละเรื่อง (my-pending / all-documents)
- ความสูง `DataGridContainer` มี 8 สูตร `max-h-[calc(...)]` — สูตรหลัก 2 ค่าของ CLT ใช้ 58 จุด
  ที่เหลือ 6 สูตร 9 จุดเป็นการชดเชยแถบสรุปที่หน้านั้นมีเพิ่ม หรือก๊อปผิด
- `ListToolbar` มีอยู่แล้ว 23 หน้า แต่หน้า DLH อีก 21 หน้าประกอบ search/filter เอง (ย้ายเฉพาะ
  หน้าที่ใช้ `useListFilters` อยู่แล้ว — accounting ไม่ย้าย)

## 2. ของกลางใหม่

### 2.1 `components/share/list-page-shell.tsx`

ถือเฉพาะโครงที่ CLT วาดอยู่ที่ `config-list-template.tsx:328-443` วันนี้ — ไม่รู้จัก table,
query, permission

```tsx
interface ListPageShellProps {
  readonly title: string;
  readonly description: string;
  readonly count?: number;              // → DocumentListHeader (ซ่อนเมื่อ 0/undefined เหมือนเดิม)
  readonly actions?: ReactNode;         // ปกติคือ <DocumentListActions …>; ไม่ส่ง = ไม่มีปุ่ม
  readonly toolbar?: ReactNode;         // ปกติคือ <ListToolbar …>; accounting ส่ง toolbar เดิมของตัวเอง
  readonly pullRefresh?: ReturnType<typeof usePullToRefresh>; // CLT ใช้ตัวเดียว; มีค่า = วาด indicator + ผูก containerRef
  readonly children: ReactNode;         // content: DataGrid / card grid / อะไรก็ได้
}
```

มาร์กอัป (ย้ายจาก CLT ตรง ๆ ไม่แต่ง):

```
div.pb-[max(1rem,env(safe-area-inset-bottom))]  (ref = pullRefresh.containerRef ถ้ามี)
  [pull-refresh indicator — เฉพาะเมื่อ pullRefresh && isMobile && (distance>0 || isRefreshing)]
  div.sticky.top-0.z-20.space-y-3.pb-3.sm:static.sm:pb-0
    div.flex.flex-col.gap-2.sm:flex-row.sm:items-center.sm:justify-between
      <DocumentListHeader title description count />
      {actions}
    {toolbar}
  div.mt-3.space-y-3
    {children}
```

- sticky เปิดเสมอ (ไม่มี prop ปิด) — หน้าที่เคยไม่ sticky 10 หน้าจะ sticky ตาม CLT นี่คือการรวมสไตล์
- ไม่มี slot `filterBar` แยก — `ListToolbar` แบบไม่ bare ต่อ `ActiveFilterBar` ท้ายให้อยู่แล้ว
  (`list-toolbar.tsx` บรรทัดท้าย) หน้าที่เคยใช้ `DisplayTemplate` + `variant="bare"` เปลี่ยนเป็น
  `ListToolbar` ปกติแล้วตัด `filterBar` ทิ้ง
- ไม่ใส่ `"use no memo"` — shell ไม่รับ table instance จึงไม่โดนกับดัก React Compiler
  (`routes/CLAUDE.md`) ตัวหน้าที่มีตารางยังต้องมี directive ของตัวเองเท่าที่มีอยู่
- `DocumentListHeader` ยังเป็น export อยู่ (shell เรียก + เทสต์เดิม) แต่ห้ามเรียกจาก `routes/`
  โดยตรง — ข้อ 5

### 2.2 `components/share/display-mode-toggle.tsx`

```tsx
<DisplayModeToggle value={displayMode} onChange={setDisplayMode} />
```

ปุ่มคู่ `LayoutList` / `LayoutGrid` ใน `div.flex.items-center.rounded-md.border` ตามที่
`list-toolbar.tsx` กับ CLT วาดอยู่ (ปุ่ม `icon-sm`, active = `secondary`, idle = `ghost`,
aria-label `common.aria.listView` / `common.aria.gridView`) · `ListToolbar` เปลี่ยนมาเรียกตัวนี้ ·
9 หน้าที่วาดเองย้ายมาเรียก

### 2.3 ค่าคงที่ความสูงตาราง — `components/share/list-grid-max-h.ts`

(แยกไฟล์จาก shell เพราะ ESLint `react-refresh/only-export-components` เตือนเมื่อไฟล์คอมโพเนนต์ export ค่าอื่น)

```ts
export const LIST_GRID_MAX_H = {
  base: "max-h-[calc(100vh-10rem-3rem)]",
  withFilters: "max-h-[calc(100vh-13rem-3rem)]",
} as const;
export const listGridMaxH = (hasActiveFilters: boolean) =>
  hasActiveFilters ? LIST_GRID_MAX_H.withFilters : LIST_GRID_MAX_H.base;
```

ทุกหน้าใช้ `listGridMaxH(lf.activeFilters.length > 0)` · หน้าที่มีแถบสรุปเพิ่มเหนือตาราง (เช่น
wastage-reporting) ยังเขียน calc เองได้ แต่ต้องมี comment บอกว่าชดเชยอะไร — ไม่ใช่ตัวเลขลอย ๆ

## 3. `ConfigListTemplate` ย้ายมาใช้ shell

`config-list-template.tsx:328-443` แทนด้วย `<ListPageShell title description actions toolbar
pullRefresh>` — actions = `DocumentListActions` ชุดเดิม, toolbar = บล็อก search/ViewSelector/
ListFilter/Sort/ColumnVisibility/DisplayModeToggle เดิม (ยังไม่สลับเป็น `ListToolbar` ในงานนี้
เพราะ CLT ซ่อน ColumnVisibility ตอน grid mode ซึ่ง `ListToolbar` ไม่ทำ — เก็บไว้ก่อน ไม่ขยาย
scope) · dialog / delete flow / SaveViewDialog อยู่ท้าย children เหมือนเดิม ·
`config-list-template.license.test.tsx` ต้องเขียวโดยไม่แก้ assertion

## 4. การย้ายหน้า (50 หน้า)

กฎเดียวกันทุกหน้า: ตัด wrapper + บล็อก sticky + แถว header ออก → `<ListPageShell>` · ปุ่ม Add ที่
เป็น `<Plus>` Button สด → `DocumentListActions` (`hideExportPrint` เมื่อหน้านั้นไม่มี export/print) ·
สวิตช์ list/grid สด → `DisplayModeToggle` · `max-h-[calc…]` → `listGridMaxH(...)` · ลบ import ที่
ไม่ใช้แล้ว · **ไม่แตะ** query / column / filter field / i18n key / การ navigate

### PR 2 — procurement · store-operation · vendor-management (13 หน้า)

| ไฟล์ | ตอนนี้ | หมายเหตุ |
|---|---|---|
| `routes/procurement/credit-note/cn-component.tsx` | DLH sticky clone + DLA + ListToolbar | — |
| `routes/procurement/goods-receive-note/grn-component.tsx` | เหมือน cn | — |
| `routes/procurement/purchase-order/po-component.tsx` | เหมือน cn + ViewModeToggle | `ViewModeToggle` อยู่ใน `beforeViewSelector` ของ ListToolbar ตามเดิม |
| `routes/procurement/purchase-request/pr-component.tsx` | เหมือน po | — |
| `routes/procurement/purchase-request-template/prt-component.tsx` | DLH sticky clone + `<Plus>` สด | → DLA `hideExportPrint` |
| `routes/procurement/approval/approval-component.tsx` | DisplayTemplate | ไม่มีปุ่ม Add |
| `routes/store-operation/store-requisition/sr-component.tsx` | DLH sticky clone + DLA + ViewModeToggle, ไม่ใช้ ListToolbar | ย้าย toolbar สดเป็น `ListToolbar` ถ้าใช้ `useListFilters` อยู่แล้ว (ตรวจตอนทำ) |
| `routes/store-operation/stock-replenishment/stock-repl-component.tsx` | DisplayTemplate + ListToolbar bare | ListToolbar ปกติ ตัด filterBar |
| `routes/store-operation/wastage-reporting/wr-component.tsx` | DisplayTemplate + ListToolbar bare + แถบสรุป | เหมือนบน · calc สูงเขียนเองได้พร้อม comment |
| `routes/vendor-management/{price-list-template/plt,price-list/pl,request-price-list/rfp,vendor/vendor}-component.tsx` (4 ไฟล์) | DLH sticky clone + DLA | rfp มีสวิตช์ list/grid สด → `DisplayModeToggle` |

### PR 3 — system-admin · report · config · operation-plan (26 หน้า)

| ไฟล์ | ตอนนี้ | หมายเหตุ |
|---|---|---|
| `routes/system-admin/{activity-log,document,user-activity,user}/*-component.tsx` (4) | DLH sticky clone | ไม่มี Add |
| `routes/system-admin/{inventory-period,role,running-code,workflow}/*-component.tsx` (`wf-component.tsx`) (4) | DLH sticky clone + `<Plus>` สด | → DLA · role/running-code/wf ไม่ใช้ ListToolbar — ย้ายถ้าใช้ `useListFilters` |
| `routes/system-admin/notification-template/noti-tmpl.tsx` | DLH ไม่ sticky, `space-y-4 p-3` | ตัด `p-3` (root-layout ให้แล้ว) |
| `routes/system-admin/dashboard-dataset/dashboard-dataset-component.tsx` | DLH ไม่ sticky, article cards | children = card grid เดิม |
| `routes/system-admin/email-profile/email-profile.route.tsx` (338 บรรทัด) | `<header>` + h1 สด, `max-w-4xl` | ย้าย body ออกเป็น `email-profile-component.tsx` ให้ `.route.tsx` เป็น wrapper · ตัด `max-w-4xl` (หน้า list เต็มความกว้างตาม DESIGN.md §Grid) |
| `routes/system-admin/email-template/email-template.route.tsx` (257 บรรทัด) | เหมือนบน | เหมือนบน |
| `routes/system-admin/interface/` (list) | `<header>` + h1 สด, `max-w-4xl` | เหมือนบน (ดู `routes/system-admin/interface/CLAUDE.md` ก่อนแตะ) |
| `routes/report/list/report-component.tsx` | DLH sticky clone, สวิตช์สด, ไม่มี Add | → `DisplayModeToggle` |
| `routes/report/{history,schedules}/*-component.tsx` (2) | DLH ไม่ sticky `space-y-3` | history มีสวิตช์สด · schedules มี `<Plus>` สด |
| `routes/config/exchange-rate/exchange-rate-component.tsx` | DLH sticky clone + สวิตช์สด | — |
| `routes/config/{account-grouping/account-grouping-page,chart-of-account-mapping/coam-component,title-master/title-master-page}.tsx` (3) | DisplayTemplate | — |
| `routes/operation-plan/{category/recipe-category,cuisine/cuisine,equipment-category/equipment-category,equipment/eq,recipe/recipe}-component.tsx` (5) | DLH sticky clone + `<Plus>` สด | → DLA `hideExportPrint` |
| `routes/operation-plan/recipe-equipment-category/recipe-equipment-category-component.tsx` | DisplayTemplate | — |

### PR 4 — accounting · inventory-management · product-management (11 หน้า) + ลบของเก่า

| ไฟล์ | ตอนนี้ | หมายเหตุ |
|---|---|---|
| `routes/accounting/accounts-payable/ap-invoice-list.tsx` | DLH sticky clone, `<Plus>` สด, สวิตช์สด | toolbar เดิม (StatusFilter ฯลฯ) ลง slot ทั้งก้อน · ข้อความอังกฤษคงไว้ |
| `routes/accounting/accounts-payable/ap-payment-list.tsx` | DLH ไม่ sticky | เหมือนบน |
| `routes/accounting/accounts-receivable/ar-invoice-list.route.tsx` | ทั้งหน้าอยู่ใน `.route.tsx` | ย้าย body เป็น `ar-invoice-list.tsx` + shell |
| `routes/accounting/documents/accounting-document-list.tsx` | DLH sticky clone, สวิตช์สด | — |
| `routes/accounting/journal-voucher/journal-voucher-list.tsx` | DLH ไม่ sticky + ListCard | — |
| `routes/inventory-management/inventory-adjustment/ia-component.tsx` | DLH sticky clone, ไม่มี Add/สวิตช์ | — |
| `routes/inventory-management/physical-count/pc-component.tsx` | `InvListShell` full-bleed + DLH, cards | ถอด `InvListShell` · คง `AnimationStyles` ถ้า card ใช้ `Reveal` (ย้ายไปวางใน children) |
| `routes/inventory-management/spot-check/sc-component.tsx` | เหมือน pc | เหมือน pc |
| `routes/inventory-management/transaction/transaction-component.tsx` | full-bleed เขียนเอง `-mx-3 -my-3` + DLH + DataGrid | ถอด full-bleed |
| `routes/product-management/product/pd-component.tsx` · `routes/product-management/category/category-component.tsx` | DLH sticky clone + DLA / + `<Plus>` สด (tree) | category: children = `TreeContent` |

ลบเมื่อไม่มีผู้ใช้: `components/display-template.tsx` · `InvListShell` ใน
`routes/inventory-management/shared/inv-shared.tsx` (คง `InvSearchBar`) · ตัด allowlist ของ guard
test ให้เหลือว่าง

**ไม่ย้าย:** `routes/accounting/dashboard/accounting-dashboard-page.tsx` ใช้ DLH เป็นหัว dashboard —
เป็นเรื่องของงาน landing (spec ถัดไป) ใส่ไว้ใน allowlist ถาวรพร้อมเหตุผล

## 5. กฎกันถอยหลัง — `components/share/__tests__/list-page-shell.usage.test.ts`

แบบเดียวกับ `components/ui/type-ladder.test.ts`: อ่านทุก `.tsx` ใต้ `routes/` (ข้าม `*.test.tsx`)
แล้วแดงเมื่อ

1. มี `<DocumentListHeader` นอก allowlist
2. มี `sticky top-0 z-20` (ลายเซ็นของบล็อกที่ก๊อปจาก CLT)
3. มี `<DisplayTemplate`
4. มี `<LayoutList` หรือ `<LayoutGrid` (ต้องผ่าน `DisplayModeToggle`)

allowlist เป็น map ไฟล์→จำนวนลายเซ็นในไฟล์เทสต์ · PR 1 ใส่ครบทุกไฟล์ที่ยังมีลายเซ็น (47 +
accounting-dashboard-page = 48; email-profile / email-template / interface เขียน `<h1>` สดจึงไม่มี
ลายเซ็นให้ grep — ติดตามผ่าน §4 ไม่ใช่ guard) · PR 2–4 ตัดออกตามที่ย้าย · จบงานเหลือ
`accounting-dashboard-page.tsx` ตัวเดียวพร้อม comment

## 6. การตรวจ

ทุก PR: `bun run typecheck` · `bun run lint` · `bun test:run` เขียวทั้ง suite (เทสต์ของ CLT /
DLH / DLA / ListToolbar เดิมต้องไม่แก้ assertion) · ไม่เขียนเทสต์ใหม่นอกจาก (ก) `list-page-shell.test.tsx`
ตรวจ slot / count / pull-refresh indicator (ข) `display-mode-toggle.test.tsx` (ค) guard test ข้อ 5

เบราว์เซอร์ (dev backend, admin@zebra.com): เปิดทุกหน้าในโมดูลของ PR นั้นทั้ง desktop และความกว้าง
มือถือ (<640px) ตรวจ 4 อย่าง — หัว + badge นับ · ปุ่ม Add/Export ครบเท่าเดิม · บล็อก sticky ติดบน
มือถือ · เปลี่ยนหน้า pagination แล้วตารางขยับ (กับดัก React Compiler ใน `routes/CLAUDE.md` — ถ้าค้าง
ใส่ `"use no memo"` ที่หน้านั้น)

## 7. ลำดับส่งงาน

| PR | เนื้อหา | ไฟล์ |
|---|---|---|
| 1 | `ListPageShell` + `DisplayModeToggle` + `listGridMaxH` + CLT ย้ายมาใช้ + `ListToolbar` ใช้ toggle + guard test (allowlist เต็ม) | ~7 |
| 2 | procurement · store-operation · vendor-management | 13 + allowlist |
| 3 | system-admin · report · config · operation-plan | 26 + allowlist |
| 4 | accounting · inventory · product-management + ลบ `DisplayTemplate` / `InvListShell` | 11 + 2 ลบ + allowlist |

แต่ละ PR merge เข้า `main` แยกกัน (merge commit ไม่ squash — memory changelog-generator) · deploy
ด้วย `vercel --prod` จากเครื่องหลัง PR 4 หรือหลัง PR ใดก็ได้ที่อยาก soak

## 8. นอกขอบเขต (spec ถัดไป)

- หน้า form 65 หน้า: 3 ชั้นของ `DocFormHeader` / `FormToolbar` / wrapper ประจำโมดูล · `FormToolbar`
  ซ้ำชื่อใน `routes/product-management/product/pd-form-toolbar.tsx` · ปุ่มย้อนกลับ 4 แบบ ·
  padding 4 ค่า · max-width 3 ค่า
- หน้า landing โมดูล 12 หน้า 5 แบบ (`DashboardWidgetGrid` / `AccountingDashboardPage` /
  `ModuleLanding` / inline / hero)
- i18n ของ accounting 5 หน้า · ย้าย accounting ไป `useListFilters` + `ListToolbar`
- ย้าย toolbar ของ CLT ไปใช้ `ListToolbar` (ติดเรื่องซ่อน ColumnVisibility ตอน grid)
- เปลี่ยนความสูงตารางจาก `calc(100vh-…)` เป็น flex `min-h-0` — กระทบ sticky header ของ DataGrid
  ต้องทดลองแยก
