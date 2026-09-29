# Lazy lookup ช่วง 3a — ย้ายจุด `perpage=-1` ใต้ `routes/` (dropdown / id→ชื่อ / ตัวกรอง)

- วันที่: 2026-09-29
- ต่อจาก: `docs/superpowers/specs/2026-09-29-lazy-lookup-no-perpage-all-design.md` (ช่วง 1–2, PR #197)
- ฝั่ง backend: ไม่มีการเปลี่ยนแปลง — deploy FE ได้เลย

## 1. เป้าหมายและขอบเขต

เลิกดึงทะเบียนทั้งก้อน (`perpage: -1`) ในจุดที่จริง ๆ ต้องการแค่ (ก) ตัวเลือกให้ผู้ใช้เลือก
(ข) ชื่อของ id ที่อยู่บนหน้าจอ หรือ (ค) ค่า default ตัวเดียว — ใช้โครงที่ merge แล้วใน PR #197
(`useLookupPagination`, `useEntitiesByIds`, `EntityMultiFilter`, `LookupCombobox.selectedItems`)

แรงจูงใจเดิม (A+B+C): เร็วขึ้น · backend จะเลิกรองรับ `-1` · dropdown แบบเดียวกันทั้งแอป (ค้นที่ server + เลื่อนโหลดเพิ่ม)

### 1.1 ช่วง 3 แตกเป็นสองส่วน

| ส่วน | เนื้อหา | spec |
|---|---|---|
| **3a (ฉบับนี้)** | ตัวกรองหน้า list · id→ชื่อ · dropdown ในฟอร์ม · ค่า default · lookup เก่า 16 ตัว · หน้า log | ฉบับนี้ |
| 3b | ตัวเลือกหลายค่าในฟอร์มที่ต้อง "เห็นทั้งทะเบียน": `Transfer` ใน `location-form`/`department-form`, product picker ใน `location-form`/`plt-item-fields`, user/product ใน `wf-edit-content`, roles checklist ใน `user-assigned-form`, `user-assigned-locations`, `schedule-recipients-field`, แผนกใน `wf-routing` · ลบ `useAllUsers`/`useAllProducts` | แยก |
| 4 | จุดที่ต้องได้ครบจริง: `permission-picker`, `use-role-print`, `category-component` ×3, `use-report-form-templates`, `inventory-period-component`, `exchange-rate-component`, `sc-component` (spot-check history) แล้วค่อยปิด `-1` ที่ backend | แยก |

### 1.2 เกณฑ์เสร็จ

- `grep -rnE "perpage:\s*-1|perpage=-1|useAllUsers|useAllProducts" routes components hooks` เหลือเฉพาะจุดของ 3b และ 4 ตามตาราง §1.1 (รวม `hooks/use-all-*.ts` ที่ 3b จะลบ)
- lookup ทุกตัวใน `components/lookup/` ส่ง `selectedIds` — ชื่อของค่าที่เลือกขึ้นเสมอแม้อยู่นอกหน้าแรก (ยกเว้นที่ §6 บันทึกไว้ว่า endpoint ไม่รองรับ)
- `bun run typecheck` · `bun run lint` (0 error) · `bun test:run` ผ่าน (แก้เทสต์เดิมที่อ้างโครงเก่า ไม่เขียนเทสต์ใหม่)
- ตรวจในเบราว์เซอร์ตาม §7

## 2. ข้อเท็จจริงของ backend (probe T02, 2026-09-29)

ทุก endpoint ด้านล่างรองรับ `filter=id|string:a,b` และ `search`

| endpoint | `is_active\|boolean:true` | หมายเหตุ |
|---|---|---|
| `config/adjustment-types` | ได้ | `type` มี `stock_in`/`stock_out`/`eop_in`/`eop_out`; `is_active\|boolean:true,type\|string:stock_in` ได้ |
| `config/recipe-cuisines` | ได้ | |
| `config/recipe-equipment-categories` | ได้ | |
| `config/recipe-categories` | ได้ | |
| `pricelist-templates` | **500** | ไม่มี `is_active` — ใช้ `status\|string:active` |
| `config/product-master-eco-labels` | ได้ | |
| `config/vendor-master-certificates` | ได้ | |
| `config/vendor-business-types` | ได้ | |
| `config/units` | ได้ | |
| `config/locations` | ได้ | |
| `user-locations` | ได้ | |
| `config/delivery-points` | ได้ | |
| `config/products` | ไม่มีฟิลด์ (ไม่ error) | |
| `physical-count-periods` | **400** | ห้ามส่ง (ยืนยันแล้วใน PR #197) |
| `config/workflows` | ได้ | |

ข้อเท็จจริงเดิมจาก PR #197 ยังใช้: หลายเงื่อนไขคั่น `,` ใน `filter` เดียว (AND) · ส่ง `filter` ซ้ำไม่ได้ ·
users ใช้ `user_id|string:` และห้ามส่ง `is_active` · credit-note-reasons ห้ามส่ง `is_active`

## 3. `control: "entity"` — ตัวกรองหน้า list แบบทั่วไป

### 3.1 type

```ts
// components/filter/entity-filter-source.ts (ใหม่)
export interface EntityFilterSource<T> {
  /** คอลัมน์ใน clause — ค่า URL เป็น `<fieldKey>|string:id1,id2` */
  readonly fieldKey: string;
  readonly useListHook: LookupListHook<T>;
  /** default (x) => x.id */
  readonly getId?: (item: T) => string;
  readonly getLabel: (item: T) => string;
  /** users = "user_id" */
  readonly idFilterKey?: string;
  /** default ACTIVE_ONLY_FILTER; ส่ง null เพื่อไม่กรอง */
  readonly serverFilter?: string | null;
}

// types/list-filter.ts — เพิ่ม member แทน department/vendor/requester
| (FilterFieldBase & {
    readonly control: "entity";
    readonly entity: EntityFilterSource<any>;
  })
```

### 3.2 ตัวกรอง

`components/list-filter/filter-field-control.tsx` เพิ่ม `case "entity"` → `<EntityMultiFilter>` จาก
`field.entity` + `label={t(field.labelKey)}` ค่า URL คงรูป `<fieldKey>|string:…` เหมือนที่ `custom`
+ `MultiSelectFilter` ส่งอยู่เดิม — saved view (`use-list-views` เก็บเฉพาะค่า) และ deep link เดิมใช้ต่อได้

### 3.3 ชื่อบน chip

ลบ `idsOf` + `useEntitiesByIds` ×3 + สาขา `department`/`vendor`/`requester` ออกจาก
`hooks/use-list-filters.ts` — `ActiveFilter` ของ field `entity` พก `entity` + ค่าดิบออกไป แล้ว
`ActiveFilterBar` render `<EntityChipValue>` (ใหม่ ใน `components/list-filter/`) ซึ่งเรียก
`useEntitiesByIds` ของตัวเอง → "ชื่อแรก +N" (ใช้ `firstPlusRest` ตัวเดิม) · ระหว่างโหลดตกเป็น
fallback แบบนับจำนวนเหมือนเดิม · query key ตรงกับ `EntityMultiFilter` (id เรียงแล้ว) จึงไม่ยิงซ้ำ

### 3.4 ย้าย control เดิม

ประกาศค่าสำเร็จรูปใน `components/filter/entity-sources.ts`: `VENDOR_ENTITY`, `DEPARTMENT_ENTITY`,
`requesterEntity(fieldKey = "requestor_id")` (ชื่อเต็ม firstname/middlename/lastname เหมือนเดิม)
แล้วแก้ 11 จุดที่ประกาศ `control: "vendor" | "department" | "requester"` เป็น `control: "entity"`
ลบสามชนิดออกจาก union · `FilterVendor`/`FilterDepartment`/`FilterRequester` ลบถ้าไม่เหลือผู้ใช้นอก
`filter-field-control` (ตอนนี้ใช้ใน `use-cn-filter-fields`, `grn-invoice-filter`, `user-department-filter` — ย้ายผู้ใช้ก่อน)

### 3.5 ตัวกรองที่ย้ายมาใช้ `entity`

| ไฟล์ | fieldKey | serverFilter |
|---|---|---|
| `product/pd-component.tsx` category / sub / item group | `product_category_id` / `product_sub_category_id` / `product_item_group_id` | active |
| `vendor/vendor-component.tsx` business type | ตามค่าเดิมในไฟล์ | active |
| `recipe/recipe-component.tsx` cuisine / category | ตามค่าเดิม | active |
| `category/recipe-category-component.tsx` parent | `parent_id` | active |
| `equipment/eq-component.tsx` category | ตามค่าเดิม | active |
| `inventory-adjustment/ia-component.tsx` adjustment type | ตามค่าเดิม | active |
| `request-price-list/rfp-component.tsx` template | ตามค่าเดิม | `status\|string:active` |
| `price-list/pl-component.tsx` currency | ตามค่าเดิม | active |
| `user/user-department-filter.tsx` | ตามค่าเดิม | active |
| `store-requisition/sr-filter-from-location.tsx` / `sr-filter-to-location.tsx` | ตามค่าเดิม | ตามที่ไฟล์กรองอยู่ |
| `activity-log`, `user-activity` ตัวกรองผู้ใช้ | ตามค่าเดิม | ไม่กรอง (`null`), `idFilterKey: "user_id"` |

"ตามค่าเดิม" = ค่า `value` ที่ไฟล์นั้นสร้างอยู่ตอนนี้ (implementer อ่านจากโค้ด ห้ามเปลี่ยน — URL/saved view ผูกอยู่)
ตัวกรองที่เดิมกรอง `is_active` ในเครื่องให้ใช้ active · ตัวที่เดิมไม่กรองให้ใส่ `null`
`grn-invoice-filter` เก็บเลขใบแจ้งหนี้ (ไม่ใช่ id) — คงโครงเดิม แค่เปลี่ยนแหล่งรายการให้โหลดทีละหน้าถ้าทำได้โดยไม่เปลี่ยนค่าที่เก็บ;
ถ้าไม่ได้ ให้ย้ายไปช่วง 4 และบันทึกเหตุผล

พฤติกรรมที่เปลี่ยน: ลำดับตัวเลือกตาม server (ไม่ sort ในเครื่อง) · ตัวที่ปิดใช้งานไม่อยู่ในรายการ แต่ค่าที่ค้างอยู่ยังขึ้นชื่อ

## 4. id→ชื่อ / ค่า default

เก็บ id ที่แถวบนหน้านั้นอ้างถึง (unique) → `useEntitiesByIds` → `Map` · ไม่มี id = ไม่ยิง ·
ระหว่างโหลดแสดงค่าว่าง/ค่าสำรองที่มีอยู่ในแถว ห้ามแสดง id ดิบ

| ไฟล์ | entity | ใช้ทำอะไร |
|---|---|---|
| `spot-check/sc-entry-component.tsx`, `sc-review-component.tsx` | unit | ชื่อหน่วยของแถว |
| `product/pd-tab-unit-conversion.tsx` | unit | ชื่อหน่วยในตาราง conversion |
| `credit-note/cn-footer-action.tsx` | currency | code ของ `currencyId` |
| `goods-receive-note/grn-summary-footer.tsx` | currency | code ของ `currencyId` (fallback `currency_name` ตามเดิม) |
| `purchase-order/from-price-list/step-select-items.tsx` | currency | rate ของสกุลในแถว price list |
| `purchase-order/from-price-list/step-summary.tsx` | location | ชื่อ location ของ item |
| `purchase-order/po-general-fields.tsx` | currency | object ของ `defaultCurrencyId` (ตั้ง rate ตั้งต้น) |
| `purchase-request/pr-item-cells/location-cell.tsx` | user-location | `location_type` ของ `locationId` เมื่อ API ไม่ส่งมา |
| `product/pd-tab-eco.tsx` | eco label master | ข้อมูล master ของแถว |
| `vendor/vendor-certificate-section.tsx` | certificate master | ข้อมูล master ของแถว |
| `category/recipe-category-form.tsx` | recipe category | parent ของ `parentId` (ค่าที่สืบทอด + `getCategoryName`) |
| `recipe/recipe-component.tsx` (ตาราง + `RecipeCard`) | cuisine, recipe category | ชื่อของแถวในหน้าปัจจุบัน |
| `activity-log`, `user-activity` | user (`user_id`) | ชื่อผู้กระทำของแถวในหน้าปัจจุบัน |

**กับดัก:** `pd-tab-eco` / `vendor-certificate-section` ใส่ master ใน deps ของ `columns` — `Map` ที่สร้างต้อง
`useMemo` บน `items` (reference คงที่จาก react-query / `EMPTY`) ไม่งั้นเจอปัญหาตารางค้าง
(memory `editable-datagrid-must-memoize-columns`) · `step-select-items` เดิมเคยพลาดเงียบ ๆ เพราะหาเรตไม่เจอ
(ได้ 1) — ระหว่างโหลดต้องไม่ปล่อยให้ติ๊กแถวสกุลต่างประเทศด้วยเรต 1: ถือว่า "ยังไม่พร้อม" จนกว่าเรตของสกุลนั้นมาถึง

## 5. dropdown ในฟอร์ม

lookup ใหม่วางข้าง feature (ใช้โมดูลเดียว) ใช้ `useLookupPagination` + `selectedIds` + `LookupCombobox` ตามแบบ `lookup-currency.tsx`

| lookup ใหม่ | ที่อยู่ | serverFilter | ผู้ใช้ |
|---|---|---|---|
| `LookupAdjustmentType` | `routes/inventory-management/inventory-adjustment/` | `is_active\|boolean:true,type\|string:<stock_in\|stock_out>` | `ia-form.tsx` (ค่าที่บันทึกไว้แม้ปิดใช้งานยังขึ้นผ่าน `selectedItems` — แทน `at.id === savedAdjTypeId` เดิม) |
| `LookupEcoLabel` | `routes/product-management/product/` | active | `pd-eco-label-dialog.tsx` |
| `LookupCertification` | `routes/vendor-management/vendor/` | active | `vendor-certificate-dialog.tsx` |

`allowDeselect={false}` ถ้าที่เดิมเป็น `<Select>` (บทเรียน PR #197)

## 6. lookup เก่า 16 ตัว

`lookup-cuisine`, `lookup-delivery-point`, `lookup-dataset`, `lookup-grn-by-vendor-for-cn`,
`lookup-physical-count-period`, `lookup-location`, `lookup-product-in-location`, `lookup-product`,
`lookup-unit`, `lookup-recipe-category`, `lookup-vendor`, `lookup-equipment-category`,
`lookup-location-pair-product`, `lookup-product-location`, `lookup-prt`, `lookup-user-location`

- ส่ง `selectedIds: value ? [value] : []` (+ `getId`/`idFilterKey` สำหรับ entity ที่ id ไม่ใช่ `id`) และ `selectedItems` ให้ `LookupCombobox`
- `enabled: hasOpened || !!value` → `enabled: hasOpened`
- lookup ที่ endpoint ต้องมี parent (location-pair-product, product-in-location, product-location, grn-by-vendor-for-cn) — ถ้า endpoint ย่อยไม่รับ `id|string:` ให้คงการหา label แบบเดิมและบันทึกในรายงาน (probe ก่อนแก้)
- `lookup-physical-count-period`: แก้ให้อ่านวันที่จาก `tb_inventory_period.start_at`/`end_at` (บั๊กเดิม — dropdown ว่างเสมอ) · ห้ามส่ง `is_active`

## 7. ตรวจในเบราว์เซอร์ (รูปแบบละตัวแทน)

1. product list: ตัวกรอง category — เปิด popover โหลดทีละหน้า, ค้นที่ server, chip ขึ้นชื่อเมื่อเปิดจาก deep link
2. PR/PO list: ตัวกรอง vendor/แผนก/ผู้ขอ ยังทำงานเหมือน PR #197 (ย้ายไป `entity` แล้ว)
3. PO ใหม่: currency ตั้งต้นถูกตั้งพร้อม rate
4. spot-check entry: ชื่อหน่วยขึ้นครบ
5. IA ฟอร์ม: adjustment type เฉพาะชนิด in/out ที่ตรงกับเอกสาร
6. activity log: ชื่อผู้กระทำขึ้น, ตัวกรองผู้ใช้ค้นได้
7. lookup เก่า (vendor): ค่าที่อยู่นอกหน้าแรกขึ้นชื่อทันทีโดยไม่ต้องเปิด popover

ตรวจกับ backend local (:4000 ซึ่งเป็น shared dev DB) — อ่านอย่างเดียว ไม่เขียน DB · CORS รับแค่ `localhost:3000`
(ดู memory `lazy-lookup-no-perpage-all`)

## 8. ความเสี่ยง

- ชื่อ/ค่าที่เคยพร้อมตั้งแต่เปิดหน้า มาช้ากว่าหนึ่ง round-trip — ยอมรับ แต่ห้ามแสดง id ดิบ
- control ชนิด `vendor`/`department`/`requester` หายจาก union — tsc จับทุกผู้ใช้ · saved view ไม่เก็บชนิด control จึงไม่กระทบ
- ลำดับตัวเลือกเปลี่ยน (server order)
