# Lazy Lookup ช่วง 3a (ย้ายจุด `perpage=-1` ใต้ `routes/`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เลิกดึงทะเบียนทั้งก้อน (`perpage: -1`) ในตัวกรองหน้า list, การแปลง id→ชื่อ, ค่า default และ dropdown ในฟอร์มใต้ `routes/` แล้วให้ lookup เก่า 16 ตัวใน `components/lookup/` แสดงชื่อของค่าที่เลือกได้เสมอผ่าน `selectedIds`

**Architecture:** เพิ่ม control ชนิดใหม่ `"entity"` ใน `FilterFieldDef` ที่พก `EntityFilterSource` (hook + getId/getLabel + filter ฝั่ง server) → `FilterFieldControl` render `EntityMultiFilter` ตัวเดิมจาก PR #197 ส่วน chip render `EntityChipValue` ที่ดึงชื่อตาม id เอง แทนสาขา department/vendor/requester ใน `useListFilters` · จุด id→ชื่อใช้ `useEntitiesByIds` กับ id ที่อยู่บนหน้าเท่านั้น · dropdown ใช้ `useLookupPagination` + `selectedIds` + `LookupCombobox.selectedItems` ตามแบบ `lookup-currency.tsx`

**Tech Stack:** React 19 + React Compiler, TanStack Query v5, TanStack Table, react-hook-form, `use-intl`, cmdk (`Command`), `VirtualCommandList`

**Spec:** `docs/superpowers/specs/2026-09-29-lazy-lookup-phase3a-routes-design.md`

## Global Constraints

- **ไม่เขียนเทสต์ใหม่ ไม่สร้างไฟล์ `*.test.ts(x)` / `*.spec.ts(x)`** (preference ของ user — override TDD) ทุก task จบด้วย `bun run typecheck` + `bun run lint` (0 error; warning ที่มีอยู่เดิมไม่ต้องแก้) + รันเทสต์เดิมของโฟลเดอร์ที่แตะ (`bun test:run <path>`) ถ้าเทสต์เดิมพังเพราะโครงเปลี่ยน ให้แก้เทสต์นั้น (ไม่เพิ่ม case ใหม่) · Task สุดท้ายรัน `bun test:run` ทั้งชุด
- commit message ภาษาไทย รูปแบบ conventional (`feat(list-filter): …`, `refactor(lookup): …`) — **ห้าม** `git commit --amend` / squash
- backend ไม่มีการเปลี่ยนแปลง · DB :4000 เป็น shared dev DB — ตรวจด้วยมือ **อ่านอย่างเดียว** ห้ามกด Save/Delete ในหน้าทดสอบถ้าไม่ได้ถาม user
- module boundary (ESLint): `components/` `hooks/` `lib/` `types/` ห้าม import จาก `routes/` · `routes/<A>/` ห้าม import `routes/<B>/` · lookup ใหม่ที่ใช้โมดูลเดียววางข้าง feature
- `perpage` ค่าเริ่มต้นของ lookup = 30 (ของ `useLookupPagination`) — ไม่ต้องส่ง `perpage: 30` ซ้ำ
- ค่า `value` ของตัวกรองที่ URL / saved view ผูกอยู่ **ห้ามเปลี่ยนรูป** (ดูตารางใน Task 4–5)
- `"use no memo";` ที่มีอยู่ในไฟล์ใด ห้ามลบ
- ข้อเท็จจริงของ backend (probe T02 2026-09-29 — ของ spec §2 + ที่ probe เพิ่มตอนเขียนแผนนี้):
  - `filter=<col>|string:a,b` = IN · หลายเงื่อนไขคั่น `,` ใน `filter` เดียว (AND) · ส่ง `filter` ซ้ำไม่ได้
  - รูปเก่าของ `MultiSelectFilter` (`product_category_id|string:A,product_category_id|string:B`) backend ตีความเท่ากับ IN (`A,B`) — ได้ 924 แถวเท่ากันทั้งสองรูป
  - `is_active|boolean:true` **ห้ามส่ง** ให้ `users` (0 แถว), `credit-note-reasons`, `physical-count-periods` (400)
  - `pricelist-templates` ไม่มี `is_active` → ใช้ `status|string:active`
  - `config/products` ใช้ `product_status_type|string:active` (`|string:inactive` → 0 แถว = filter มีผลจริง)
  - `config/locations` และ `user-locations`: `is_active|boolean:true,location_type|enum:inventory,consignment` ได้ผล IN (29+4=33) — ให้ `location_type|enum:` อยู่ **ท้ายสุด** ของ clause
  - `config/currencies` รับ `code|string:THB,USD`
  - `users` รับ `department_id|string:a,b` (6+3=9)
  - `adjustment-types` รับ `is_active|boolean:true,type|string:stock_in`
  - `physical-count-periods`: แถวไม่มี `counting_period_*` — วันที่อยู่ที่ `tb_inventory_period.start_at/end_at` · รับ `id|string:` · sort `tb_inventory_period.start_at:desc` ได้ · `search` ไม่ครอบเลขงวด (ได้ 0) · sort คอลัมน์ที่ไม่มี → 400
  - `good-received-notes`: `sort=invoice_no:asc` ได้ · `search` ครอบทั้ง `invoice_no` และ `grn_no`
  - endpoint ที่ต้องมี parent (ผล probe — **เฉพาะที่ ✓ ถึงจะส่ง `selectedIds`**):

    | endpoint | hook | id filter |
    |---|---|---|
    | `good-received-notes/vendor/:v/cn` | `useGoodsReceiveNoteByVendorForCn` | ✓ `id|string:` (hook ส่ง params ทั้งก้อนอยู่แล้ว) |
    | `config/products-location-workflow/:from/:to/:wf` | `useLocationPairProducts` | ✓ `product_id|string:` (`id` ได้ 0) — hook ต้องเพิ่มการส่ง `filter` |
    | `config/products-location-workflow/:loc/:wf` | `useProductsByLocation` (มี workflowId) | ✓ `product_id|string:` — hook ต้องเพิ่ม |
    | `products/locations/:loc` | `useProductsByLocation` (ไม่มี workflowId) | ✗ filter ถูกเมิน (ได้ 920 แถวเท่าเดิม) |
    | `user-locations/product/:p` | `useLocationsByProduct` (ไม่มี workflowId) | ✓ `id|string:` — hook ต้องเพิ่ม |
    | `config/workflows/:wf/products/:p/locations` | `useLocationsByProduct` (มี workflowId) | ✗ filter ถูกเมิน (id ปลอมยังได้ 1 แถว) |
    | `dashboard-lab/datasets` | `useDashboardDatasets` | ✗ ไม่ paginate — registry ใน code คืน `{items,count}` ทั้งชุด |

## Review Focus

1. **เปิด saved view / deep link ที่บันทึกไว้ก่อนย้ายมา `entity` ซึ่งเลือกไว้ ≥2 ค่า** (รูปเก่า `product_category_id|string:A,product_category_id|string:B`) → popover ต้องติ๊กครบทั้งสองตัว chip ขึ้นชื่อ และผลในตารางเท่าเดิม · pin: Task 1 Step 2 (`EntityMultiFilter` อ่านด้วย `clauseTokens`) + Task 9 ข้อ 2 (ตรวจมือด้วย URL รูปเก่า)
2. **ตัวกรองผู้ใช้ของ activity log / user activity จาก saved view เดิม** (`actor_id=a,b` เปล่า ๆ ไม่มี prefix) → ยังกรองได้ และ request ยังส่ง `actor_id=a,b` เป็น query param แยก ไม่ใช่ `filter=` · pin: Task 1 (`bareIds`) + Task 5 Step 6 (ตรวจ Network)
3. **PO จาก price list: ติ๊กแถวสกุลเงินต่างประเทศก่อนเรตโหลดเสร็จ** → ติ๊กไม่ได้ (แถวจาง) จนเรตมาถึง แล้ว `exchange_rate` ของฟอร์มเป็นเรตจริงไม่ใช่ 1 · pin: Task 7 Step 4 + Task 9 ข้อ 3
4. **แท็บ eco label / certificate ของ vendor หลังกด Save แล้วสลับเป็น view** → ตารางไม่วน render (Map ของ master ต้อง `useMemo` บน items ที่ reference นิ่ง) · pin: Task 6 Step 5–6 (เทสต์เดิม `vendor-certificate-loop.test.tsx` ต้องผ่าน + เปิดหน้า vendor กด Save จริงหนึ่งครั้ง)
5. **ค่าที่บันทึกไว้แต่อยู่หลังหน้าแรกหรือถูกปิดใช้งาน** (lookup เก่า 16 ตัว, adjustment type ของ IA, eco label/certificate ในกล่องแก้ไข) → ช่องขึ้นชื่อทันทีโดยไม่ต้องเปิด popover ไม่ใช่ placeholder หรือ id ดิบ · pin: Task 2/3/8 Step "ตรวจมือ" + Task 9 ข้อ 5, 7

---

## File Structure

| ไฟล์ | หน้าที่ | Task |
|---|---|---|
| `components/filter/entity-filter-source.ts` (ใหม่) | type `EntityFilterSource` + helper `defineEntitySource` / `entityGetId` / `entityServerFilter` | 1 |
| `components/filter/entity-sources.ts` (ใหม่) | `VENDOR_ENTITY`, `DEPARTMENT_ENTITY`, `requesterEntity()` | 1 |
| `components/list-filter/entity-chip-value.tsx` (ใหม่) | ชื่อบน chip ของ field `entity` | 1 |
| `lib/list-filter-encode.ts` | ย้าย `clauseTokens` / `firstPlusRest` มา export | 1 |
| `types/list-filter.ts`, `components/list-filter/{filter-field-control,list-filter-menu}.tsx`, `components/ui/active-filter-bar.tsx`, `hooks/use-list-filters.ts`, `components/filter/entity-multi-filter.tsx` | ต่อสาย control `entity` | 1 |
| `components/filter/filter-{vendor,department,requester}.tsx` | **ลบ** | 1 |
| `components/lookup/lookup-*.tsx` ×15 + `hooks/use-{location-pair-products,products-by-location,locations-by-product}.ts` + `types/physical-count-period.ts` | `selectedIds` + serverFilter | 2, 3 |
| `routes/**` list page ×13 | ตัวกรอง → `entity` | 4, 5 |
| `routes/**` id→ชื่อ ×12 | `useEntitiesByIds` | 4, 6, 7 |
| `routes/inventory-management/inventory-adjustment/lookup-adjustment-type.tsx`, `routes/product-management/product/lookup-eco-label.tsx`, `routes/vendor-management/vendor/lookup-certification.tsx` (ใหม่) | dropdown ในฟอร์ม | 8 |

---

### Task 1: control `"entity"` + chip ชื่อ + ย้าย vendor/แผนก/ผู้ขอ + ลบ control เฉพาะทาง

**Files:**
- Create: `components/filter/entity-filter-source.ts`
- Create: `components/filter/entity-sources.ts`
- Create: `components/list-filter/entity-chip-value.tsx`
- Modify: `lib/list-filter-encode.ts` (ต่อท้ายไฟล์)
- Modify: `types/list-filter.ts` (import + union)
- Modify: `components/filter/entity-multi-filter.tsx` (props, parse ค่า)
- Modify: `components/list-filter/filter-field-control.tsx`
- Modify: `components/list-filter/list-filter-menu.tsx` (`FIELD_ICONS`, `CONTROL_ICONS`, `SUBMENU_CLASS`)
- Modify: `components/ui/active-filter-bar.tsx`
- Modify: `hooks/use-list-filters.ts` (L10-40, L220-322)
- Modify: `routes/store-operation/store-requisition/sr-component.tsx:230-241`
- Modify: `routes/procurement/purchase-order/po-component.tsx:212-229`
- Modify: `routes/procurement/credit-note/use-cn-filter-fields.tsx` (JSDoc + L55-67)
- Modify: `routes/procurement/goods-receive-note/grn-component.tsx:120-137`
- Modify: `routes/procurement/purchase-request/use-pr-filter-fields.tsx:110-121`
- Modify: `routes/vendor-management/price-list/pl-component.tsx:135-143`
- Delete: `components/filter/filter-vendor.tsx`, `components/filter/filter-department.tsx`, `components/filter/filter-requester.tsx`

**Interfaces:**
- Consumes (มีอยู่แล้วบน main): `LookupListHook<T>` จาก `@/hooks/use-entities-by-ids`, `useEntitiesByIds`, `ACTIVE_ONLY_FILTER` จาก `@/hooks/use-lookup-pagination`, `EntityMultiFilter`
- Produces:
  - `interface EntityFilterSource<T> { fieldKey: string; useListHook: LookupListHook<T>; getId?: (item: T) => string; getLabel: (item: T) => string; idFilterKey?: string; serverFilter?: string | null; bareIds?: boolean }`
  - `type AnyEntityFilterSource = EntityFilterSource<any>`
  - `defineEntitySource<T>(source: EntityFilterSource<T>): AnyEntityFilterSource`
  - `entityGetId(source)`, `entityServerFilter(source): string | undefined`
  - `FilterFieldDef` member `{ control: "entity"; entity: AnyEntityFilterSource }` (department/vendor/requester **หายจาก union**)
  - `VENDOR_ENTITY`, `DEPARTMENT_ENTITY`, `requesterEntity(fieldKey?: string)` จาก `@/components/filter/entity-sources`
  - `clauseTokens(value: string): string[]`, `firstPlusRest(names: readonly string[]): string | undefined` export จาก `@/lib/list-filter-encode`
  - `ActiveFilter.entity?: AnyEntityFilterSource`
  - `EntityMultiFilter` prop ใหม่ `bareIds?: boolean`

> หมายเหตุ `bareIds` — ไม่อยู่ใน spec §3.1 แต่จำเป็น: ตัวกรองผู้ใช้ของ activity-log / user-activity เก็บค่าเป็น id เปล่าคั่น `,` แล้วส่งเป็น query param `actor_id=` แยก (ไม่ผ่าน `filter=`) ถ้าเขียนเป็น `actor_id|string:…` saved view เดิมและ request จะเพี้ยน

- [ ] **Step 1: สร้าง `components/filter/entity-filter-source.ts`**

```ts
import type { LookupListHook } from "@/hooks/use-entities-by-ids";
import { ACTIVE_ONLY_FILTER } from "@/hooks/use-lookup-pagination";

/**
 * แหล่งรายการของตัวกรองหน้า list แบบเลือกหลายค่าจากทะเบียน (control `"entity"`)
 * — ค้นที่ server, โหลดทีละหน้า และชื่อของค่าที่เลือกไว้ดึงตาม id
 */
export interface EntityFilterSource<T> {
  /** คอลัมน์ใน clause — ค่า URL เป็น `<fieldKey>|string:id1,id2` */
  readonly fieldKey: string;
  readonly useListHook: LookupListHook<T>;
  /** default (x) => x.id */
  readonly getId?: (item: T) => string;
  readonly getLabel: (item: T) => string;
  /** คอลัมน์ id ฝั่ง backend ตอนดึงตาม id — users = "user_id", currency code = "code" */
  readonly idFilterKey?: string;
  /** default ACTIVE_ONLY_FILTER; ส่ง null เพื่อไม่กรอง */
  readonly serverFilter?: string | null;
  /**
   * ค่า URL เป็น id คั่น `,` เปล่า ๆ ไม่มี `<fieldKey>|string:` นำหน้า — หน้า log
   * ส่งค่าเป็น query param แยก (`actor_id=a,b`) ไม่ใช่ clause ของ `filter`
   */
  readonly bareIds?: boolean;
}

// FilterFieldDef ถือ source ของหลายชนิดปนกันในอาร์เรย์เดียว — ลบ T ทิ้งตรงนี้จุดเดียว
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEntityFilterSource = EntityFilterSource<any>;

/** ประกาศ source โดยให้ TS ตรวจ getId/getLabel กับ T ครบ แล้วคืนรูปที่ FilterFieldDef รับ */
export function defineEntitySource<T>(
  source: EntityFilterSource<T>,
): AnyEntityFilterSource {
  return source;
}

const defaultGetId = (item: { id: string }) => item.id;

export function entityGetId(source: AnyEntityFilterSource) {
  return source.getId ?? defaultGetId;
}

export function entityServerFilter(
  source: AnyEntityFilterSource,
): string | undefined {
  if (source.serverFilter === undefined) return ACTIVE_ONLY_FILTER;
  return source.serverFilter ?? undefined;
}
```

- [ ] **Step 2: ย้าย `clauseTokens` / `firstPlusRest` ไป `lib/list-filter-encode.ts` แล้วให้ `EntityMultiFilter` อ่านค่าด้วยมัน**

2a. ต่อท้าย `lib/list-filter-encode.ts`:

```ts
/**
 * id/ค่าใน clause ของ field เดียว — อ่านได้ทั้ง `<col>|string:a,b`,
 * รูปเก่าของ MultiSelectFilter `<col>|string:a,<col>|string:b` และค่าเปล่า `a,b`
 */
export function clauseTokens(value: string): string[] {
  return value
    .split(",")
    .map((part) =>
      part.includes(":") ? part.slice(part.lastIndexOf(":") + 1) : part,
    )
    .map((v) => v.trim())
    .filter(Boolean);
}

export function firstPlusRest(names: readonly string[]): string | undefined {
  if (names.length === 0) return undefined;
  return names[0] + (names.length > 1 ? ` +${names.length - 1}` : "");
}
```

2b. `hooks/use-list-filters.ts` — ลบฟังก์ชัน `clauseTokens` (L27-35) และ `firstPlusRest` (L37-40) ออกจากไฟล์ แล้วแก้ import L16-19:

```ts
// ก่อน
import {
  encodeFilterParam,
  viewMatchesCurrent,
} from "@/lib/list-filter-encode";
// หลัง
import {
  clauseTokens,
  encodeFilterParam,
  firstPlusRest,
  viewMatchesCurrent,
} from "@/lib/list-filter-encode";
```

2c. `components/filter/entity-multi-filter.tsx`:
- import เพิ่ม `import { clauseTokens } from "@/lib/list-filter-encode";`
- ใน `interface EntityMultiFilterProps<T>` ต่อท้าย `readonly idFilterKey?: string;` ด้วย:

```ts
  /** ค่าเป็น id เปล่าคั่น `,` (ไม่มี `<fieldKey>|string:`) — ดู EntityFilterSource.bareIds */
  readonly bareIds?: boolean;
```
- destructure เพิ่ม `bareIds,` ต่อจาก `idFilterKey,`
- แทนบล็อกเดิม:

```ts
  const prefix = `${fieldKey}|string:`;
  const selectedIds =
    value && value.startsWith(prefix)
      ? value.slice(prefix.length).split(",").filter(Boolean)
      : [];
```
ด้วย:
```ts
  const prefix = bareIds ? "" : `${fieldKey}|string:`;
  // อ่านได้ทั้งรูปปัจจุบัน รูปเก่าของ MultiSelectFilter (saved view / ลิงก์ก่อนย้าย
  // มา entity: `<col>|string:a,<col>|string:b`) และ id เปล่า — เขียนกลับรูปเดียวเสมอ
  const selectedIds = clauseTokens(value);
```
(`handleToggle` ใช้ `prefix` ตัวเดิมต่อ ไม่ต้องแก้)

- [ ] **Step 3: สร้าง `components/filter/entity-sources.ts`**

```ts
import { useDepartment } from "@/hooks/use-department";
import { useUser } from "@/hooks/use-user";
import { useVendor } from "@/hooks/use-vendor";
import { getUserFullName } from "@/components/lookup/lookup-user";
import type { Department } from "@/types/department";
import type { Vendor } from "@/types/vendor";
import type { User } from "@/types/workflows";
import { defineEntitySource } from "./entity-filter-source";

/** ผู้ขาย — clause `vendor_id|string:id1,id2` */
export const VENDOR_ENTITY = defineEntitySource<Vendor>({
  fieldKey: "vendor_id",
  useListHook: useVendor,
  getLabel: (v) => v.name,
});

/** แผนก — clause `department_id|string:id1,id2` */
export const DEPARTMENT_ENTITY = defineEntitySource<Department>({
  fieldKey: "department_id",
  useListHook: useDepartment,
  getLabel: (d) => d.name,
});

/**
 * ผู้ใช้ — default `requestor_id` (สะกดตาม schema ฝั่ง backend) · PO/CN/GRN กรอง
 * คนเปิดใบที่ `created_by_id` · ทะเบียนผู้ใช้ไม่มี `id` ต้องดึงตาม `user_id`
 * และห้ามส่ง `is_active` (users ได้ 0 แถว)
 */
export function requesterEntity(fieldKey = "requestor_id") {
  return defineEntitySource<User>({
    fieldKey,
    useListHook: useUser,
    getId: (u) => u.user_id,
    getLabel: getUserFullName,
    idFilterKey: "user_id",
    serverFilter: null,
  });
}
```

- [ ] **Step 4: สร้าง `components/list-filter/entity-chip-value.tsx`**

```tsx
import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";
import { clauseTokens, firstPlusRest } from "@/lib/list-filter-encode";
import {
  entityGetId,
  type AnyEntityFilterSource,
} from "@/components/filter/entity-filter-source";

interface EntityChipValueProps {
  readonly entity: AnyEntityFilterSource;
  readonly value: string;
  /** ข้อความระหว่างรอชื่อ (จำนวนรายการจาก chipValueText) */
  readonly fallback?: string;
}

/**
 * ค่าบน chip ของ field `entity` — ดึงเฉพาะแถวที่ id ถูกเลือก แล้วแสดง "ชื่อแรก +N"
 * query key ตรงกับ EntityMultiFilter (useEntitiesByIds เรียง id ก่อน) เปิด popover
 * ทีหลังจึงไม่ยิงซ้ำ · ระหว่างโหลดตกเป็น fallback (จำนวน) ไม่แสดง id ดิบ
 */
export function EntityChipValue({
  entity,
  value,
  fallback,
}: EntityChipValueProps) {
  const ids = clauseTokens(value);
  const getId = entityGetId(entity);
  const { items } = useEntitiesByIds({
    useListHook: entity.useListHook,
    ids,
    idFilterKey: entity.idFilterKey,
  });
  const names = ids
    .map((id) => items.find((it) => getId(it) === id))
    .filter((it) => it !== undefined)
    .map((it) => entity.getLabel(it));
  return <>{firstPlusRest(names) ?? fallback}</>;
}
```

- [ ] **Step 5: `types/list-filter.ts` — เพิ่ม member `entity` แทน 3 ชนิดเดิม**

เพิ่ม import ใต้ `import type { WORKFLOW_TYPE } from "@/types/workflows";`:
```ts
import type { AnyEntityFilterSource } from "@/components/filter/entity-filter-source";
```
แทน 3 member:
```ts
  | (FilterFieldBase & { readonly control: "department" })
  | (FilterFieldBase & { readonly control: "vendor" })
  | (FilterFieldBase & {
      readonly control: "requester";
      readonly fieldKey?: string;
    })
```
ด้วย:
```ts
  | (FilterFieldBase & {
      /** เลือกหลายค่าจากทะเบียน — ค้นที่ server, โหลดทีละหน้า, chip ขึ้นชื่อ */
      readonly control: "entity";
      readonly entity: AnyEntityFilterSource;
    })
```

- [ ] **Step 6: `components/list-filter/filter-field-control.tsx`**

แทน import 3 บรรทัด:
```ts
import { FilterDepartment } from "@/components/filter/filter-department";
import { FilterRequester } from "@/components/filter/filter-requester";
import { FilterVendor } from "@/components/filter/filter-vendor";
```
ด้วย:
```ts
import { EntityMultiFilter } from "@/components/filter/entity-multi-filter";
import {
  entityGetId,
  entityServerFilter,
} from "@/components/filter/entity-filter-source";
```
แทน `case "department":` … ถึงจบ `case "requester":` (3 case) ด้วย:
```tsx
    case "entity": {
      const source = field.entity;
      return (
        <EntityMultiFilter
          value={value}
          onChange={onChange}
          className="w-full"
          fieldKey={source.fieldKey}
          label={t(field.labelKey)}
          useListHook={source.useListHook}
          getId={entityGetId(source)}
          getLabel={source.getLabel}
          serverFilter={entityServerFilter(source)}
          idFilterKey={source.idFilterKey}
          bareIds={source.bareIds}
        />
      );
    }
```

- [ ] **Step 7: `components/list-filter/list-filter-menu.tsx`**

ใน `FIELD_ICONS` เพิ่มใต้บรรทัด `"systemAdmin.activityLog.user": UserRound,`:
```ts
  "common.requester": UserRound,
  "field.department": Building2,
  "systemAdmin.user.department": Building2,
  "field.adjustmentType": Tag,
```
ใน `CONTROL_ICONS` แทน 3 บรรทัด `department: Building2,` / `vendor: Store,` / `requester: UserRound,` ด้วย `entity: SlidersHorizontal,`
ใน `SUBMENU_CLASS` แทน `department: "w-56 p-0",` / `vendor: "w-56 p-0",` / `requester: "w-56 p-0",` ด้วย `entity: "w-56 p-0",`
(icon import ทุกตัวยังถูกใช้ — `Store` ใน `"field.vendor"`, `Building2`/`UserRound` ใน FIELD_ICONS)

- [ ] **Step 8: `components/ui/active-filter-bar.tsx`**

เพิ่ม import:
```ts
import { EntityChipValue } from "@/components/list-filter/entity-chip-value";
import type { AnyEntityFilterSource } from "@/components/filter/entity-filter-source";
```
ใน `interface ActiveFilter` ต่อท้าย `readonly peer?: FilterPeerAccess;`:
```ts
  /** field `entity` — chip ดึงชื่อตาม id เอง (`value` เป็น fallback ระหว่างโหลด) */
  readonly entity?: AnyEntityFilterSource;
```
แทน:
```tsx
        const chipText = filter.value ? (
          <>
            <span className="text-muted-foreground font-normal">
              {filter.label}
            </span>
            {filter.value}
          </>
        ) : (
          filter.label
        );
```
ด้วย:
```tsx
        const valueNode =
          filter.entity && filter.rawValue ? (
            <EntityChipValue
              entity={filter.entity}
              value={filter.rawValue}
              fallback={filter.value}
            />
          ) : (
            filter.value
          );
        const chipText = valueNode ? (
          <>
            <span className="text-muted-foreground font-normal">
              {filter.label}
            </span>
            {valueNode}
          </>
        ) : (
          filter.label
        );
```

- [ ] **Step 9: `hooks/use-list-filters.ts` — ลบการดึงชื่อ 3 ชนิด**

ลบ import 4 บรรทัด:
```ts
import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";
import { useDepartment } from "@/hooks/use-department";
import { useUser } from "@/hooks/use-user";
import { useVendor } from "@/hooks/use-vendor";
```
ลบบล็อกตั้งแต่คอมเมนต์ `// id ที่ถูกเลือกอยู่ในทุก field ของแต่ละชนิด …` ถึง `const { items: vendorItems } = useEntitiesByIds({ … });` ทั้งหมด

ใน `.map((f) => ({ … }))` ของ `activeFilters` เพิ่มหลังบล็อก `...(f.labelKey ? { … } : {}),`:
```ts
          // ชื่อของ field entity มาจาก EntityChipValue ใน ActiveFilterBar
          ...(f.control === "entity" ? { entity: f.entity } : {}),
```
แทน `value: (() => { … })(),` ทั้งก้อน (ที่มีสาขา department/vendor/requester) ด้วย:
```ts
          // ค่าซ้ำกับชื่อ field (เช่น sendback ตัวเลือกเดียว) ไม่ต้องพูดสองรอบ
          // field entity: ค่านี้เป็น fallback (จำนวน) ระหว่าง chip รอชื่อ
          value: (() => {
            const text = chipValueText(f, values[f.key], t);
            return text === t(f.labelKey) ? undefined : text;
          })(),
```
แก้ deps ของ `useMemo` นี้:
```ts
    [fields, values, t, setValue, peer],
```

- [ ] **Step 10: ย้าย 11 จุดใน `routes/` เป็น `control: "entity"`**

10a. `routes/store-operation/store-requisition/sr-component.tsx` — เพิ่ม import `import { DEPARTMENT_ENTITY, requesterEntity } from "@/components/filter/entity-sources";` แล้วแทน:
```ts
      {
        key: "user_id",
        control: "requester",
        labelKey: "common.requester",
        section: "listView.sectionPeople",
      },
      {
        key: "department",
        control: "department",
        labelKey: "field.department",
        section: "listView.sectionPeople",
      },
```
ด้วย:
```ts
      {
        key: "user_id",
        control: "entity",
        entity: requesterEntity(),
        labelKey: "common.requester",
        section: "listView.sectionPeople",
      },
      {
        key: "department",
        control: "entity",
        entity: DEPARTMENT_ENTITY,
        labelKey: "field.department",
        section: "listView.sectionPeople",
      },
```

10b. `routes/procurement/purchase-order/po-component.tsx` — import เดียวกันแต่ `{ VENDOR_ENTITY, requesterEntity }` แล้วแทน:
```ts
      {
        // ผู้จัดซื้อ = คนเปิดใบ (คอลัมน์ Buyer ใน list) — กรองที่ created_by_id
        key: "buyer",
        control: "requester",
        labelKey: "field.buyer",
        fieldKey: "created_by_id",
        section: "listView.sectionPeople",
      },
      {
        // ทะเบียน vendor ใหญ่หลักร้อย KB (T02: 858 แถว ≈ 435 KB) — control "vendor"
        // ยิงเองตอนเปิด popover ส่วนชื่อบน chip มาจาก useListFilters ที่ยิงเฉพาะ
        // เมื่อมีค่ากรองค้างจริง หน้านี้จึงไม่จ่ายค่านั้นตอน mount
        key: "vendor",
        control: "vendor",
        labelKey: "field.vendor",
        section: "listView.sectionPeople",
      },
```
ด้วย:
```ts
      {
        // ผู้จัดซื้อ = คนเปิดใบ (คอลัมน์ Buyer ใน list) — กรองที่ created_by_id
        key: "buyer",
        control: "entity",
        entity: requesterEntity("created_by_id"),
        labelKey: "field.buyer",
        section: "listView.sectionPeople",
      },
      {
        // ทะเบียน vendor ใหญ่หลักร้อย KB — control "entity" ยิงรายการเองตอนเปิด
        // popover ทีละหน้า ส่วนชื่อบน chip ดึงเฉพาะ id ที่เลือก (EntityChipValue)
        key: "vendor",
        control: "entity",
        entity: VENDOR_ENTITY,
        labelKey: "field.vendor",
        section: "listView.sectionPeople",
      },
```

10c. `routes/procurement/credit-note/use-cn-filter-fields.tsx` — import `{ VENDOR_ENTITY, requesterEntity }`; ใน JSDoc แทนประโยค `control `vendor` ยิงเองตอนเปิด popover\n * (ดู FilterVendor) ส่วนชื่อบน chip มาจาก useListFilters ที่ยิงเฉพาะเมื่อมีค่าค้างจริง` ด้วย `control `entity` ยิงเองตอนเปิด popover\n * ส่วนชื่อบน chip ดึงเฉพาะ id ที่เลือก (EntityChipValue)` แล้วแทน:
```ts
      {
        key: "vendor",
        control: "vendor",
        labelKey: "field.vendor",
        section: "listView.sectionPeople",
      },
      {
        // ผู้สร้าง = คนเปิดใบลดหนี้ (คอลัมน์ Created By ใน list) — กรองที่ created_by_id
        key: "created_by",
        control: "requester",
        labelKey: "field.createdBy",
        fieldKey: "created_by_id",
        section: "listView.sectionPeople",
      },
```
ด้วย:
```ts
      {
        key: "vendor",
        control: "entity",
        entity: VENDOR_ENTITY,
        labelKey: "field.vendor",
        section: "listView.sectionPeople",
      },
      {
        // ผู้สร้าง = คนเปิดใบลดหนี้ (คอลัมน์ Created By ใน list) — กรองที่ created_by_id
        key: "created_by",
        control: "entity",
        entity: requesterEntity("created_by_id"),
        labelKey: "field.createdBy",
        section: "listView.sectionPeople",
      },
```

10d. `routes/procurement/goods-receive-note/grn-component.tsx` — import `{ VENDOR_ENTITY, requesterEntity }` แล้วแทนสอง field `vendor` / `received_by`:
```ts
      {
        // ทะเบียน vendor ใหญ่หลักร้อย KB — control "entity" ยิงรายการเองตอนเปิด
        // popover ทีละหน้า ส่วนชื่อบน chip ดึงเฉพาะ id ที่เลือก (EntityChipValue)
        key: "vendor",
        control: "entity",
        entity: VENDOR_ENTITY,
        labelKey: "field.vendor",
        section: "listView.sectionPeople",
      },
      {
        // ผู้รับ = คนคีย์ใบรับของ (คอลัมน์ Received By ใน list) — กรองที่ created_by_id
        key: "received_by",
        control: "entity",
        entity: requesterEntity("created_by_id"),
        labelKey: "field.receivedBy",
        section: "listView.sectionPeople",
      },
```

10e. `routes/procurement/purchase-request/use-pr-filter-fields.tsx` — import `{ DEPARTMENT_ENTITY, requesterEntity }` แล้วแทนสอง field:
```ts
      {
        key: "department",
        control: "entity",
        entity: DEPARTMENT_ENTITY,
        labelKey: "field.department",
        section: "listView.sectionPeople",
      },
      {
        key: "user_id",
        control: "entity",
        entity: requesterEntity(),
        labelKey: "common.requester",
        section: "listView.sectionPeople",
      },
```

10f. `routes/vendor-management/price-list/pl-component.tsx` — import `{ VENDOR_ENTITY }` แล้วแทน field `vendor`:
```ts
      {
        // ทะเบียน vendor ใหญ่หลักร้อย KB — control "entity" ยิงรายการเองตอนเปิด
        // popover ทีละหน้า ส่วนชื่อบน chip ดึงเฉพาะ id ที่เลือก (EntityChipValue)
        key: "vendor",
        section: "listView.sectionPeople",
        control: "entity",
        entity: VENDOR_ENTITY,
        labelKey: "field.vendor",
      },
```

- [ ] **Step 11: ลบ control เฉพาะทาง**

ยืนยันไม่มีผู้ใช้เหลือ (คอมเมนต์ไม่นับ):
Run: `grep -rn "FilterVendor\|FilterDepartment\|FilterRequester" components hooks lib routes types | grep -v "^components/filter/filter-\(vendor\|department\|requester\).tsx"`
Expected: เหลือเฉพาะบรรทัดคอมเมนต์ใน `routes/procurement/goods-receive-note/grn-invoice-filter.tsx` และ `routes/system-admin/user/user-department-filter.tsx` (สองไฟล์นี้ถูกเขียนใหม่/ลบใน Task 5)

Run: `git rm components/filter/filter-vendor.tsx components/filter/filter-department.tsx components/filter/filter-requester.tsx`

- [ ] **Step 12: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error — ถ้า tsc แดงที่ `control: "vendor" | "department" | "requester"` แปลว่าหลุดจุดใน Step 10 · ถ้าแดงที่ `fieldKey` ใน field entity แปลว่ายังไม่ลบ `fieldKey:` ของ requester

Run: `bun test:run lib/__tests__/list-filter-encode.test.ts components`
Expected: PASS

- [ ] **Step 13: ตรวจมือ (สั้น)** — `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` login `admin@zebra.com` BU T02 → หน้า PR list: ตั้งตัวกรองแผนก + ผู้ขอ → chip ขึ้นชื่อ, copy URL เปิดแท็บใหม่ → ชื่อขึ้นโดยไม่เปิด popover, Network ไม่มี `perpage=-1`, ค่าใน URL ยังเป็น `department_id|string:…` / `requestor_id|string:…` · เมนู filter desktop: แถวแผนกมีไอคอนตึก แถวผู้ขอมีไอคอนคน

- [ ] **Step 14: Commit**

```bash
git add components/filter components/list-filter components/ui/active-filter-bar.tsx hooks/use-list-filters.ts lib/list-filter-encode.ts types/list-filter.ts routes/store-operation/store-requisition/sr-component.tsx routes/procurement/purchase-order/po-component.tsx routes/procurement/credit-note/use-cn-filter-fields.tsx routes/procurement/goods-receive-note/grn-component.tsx routes/procurement/purchase-request/use-pr-filter-fields.tsx routes/vendor-management/price-list/pl-component.tsx
git commit -m "feat(list-filter): control entity ตัวกรองเลือกหลายค่าจากทะเบียนแบบทั่วไป ย้ายผู้ขาย/แผนก/ผู้ขอมาใช้ แล้วลบ control เฉพาะทาง"
```

---
### Task 2: lookup เก่ากลุ่มทะเบียน config 10 ตัว → `selectedIds` + กรอง active ที่ server

**Files (Modify ทั้งหมด):**
- `components/lookup/lookup-cuisine.tsx`
- `components/lookup/lookup-delivery-point.tsx`
- `components/lookup/lookup-location.tsx`
- `components/lookup/lookup-product.tsx`
- `components/lookup/lookup-unit.tsx`
- `components/lookup/lookup-recipe-category.tsx` (+ prop `onItemChange` สำหรับ Task 6)
- `components/lookup/lookup-vendor.tsx`
- `components/lookup/lookup-equipment-category.tsx`
- `components/lookup/lookup-prt.tsx`
- `components/lookup/lookup-user-location.tsx`

**Interfaces:**
- Consumes: `useLookupPagination` (option `selectedIds`, `serverFilter`; คืน `selectedItems`), `ACTIVE_ONLY_FILTER`, `LookupCombobox` prop `selectedItems`
- Produces: `LookupRecipeCategory` prop ใหม่ `onItemChange?: (category: RecipeCategory) => void` (Task 6 ใช้) · props สาธารณะอื่นของทุก lookup **คงเดิม** (ห้ามแก้ call site)

แบบแผนร่วม (ทุกไฟล์):
1. `enabled: hasOpened || !!value` → `enabled: hasOpened` (ชื่อของค่าที่เลือกมาจาก `selectedIds` ซึ่งไม่ขึ้นกับ `enabled`)
2. ส่ง `selectedIds: value ? [value] : []` และ destructure `selectedItems` ส่งต่อ `LookupCombobox selectedItems={selectedItems}` (วางต่อจาก prop `items=`)
3. เงื่อนไข `is_active` / สถานะ ย้ายไป `serverFilter` · `excludeIds` คงเป็น `filter` ฝั่ง client
4. แก้คอมเมนต์ `// Lazy: ยิง API ตอนเปิด popover ครั้งแรก หรือเมื่อมีค่าเลือกไว้แล้ว (resolve label)` เป็น `// Lazy: ยิงรายการตอนเปิด popover ครั้งแรก — ชื่อของค่าที่เลือกดึงตาม id แยก (selectedIds)`
5. `defaultLabel` คงไว้ (ยังเป็น fallback ช่วงรอ id)

- [ ] **Step 1: `lookup-cuisine.tsx`**

imports:
```ts
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { Cuisine } from "@/types/cuisine";
```
แทนบล็อก `const { items: cuisines, … } = useLookupPagination({ … });` ด้วย:
```ts
  const {
    items: cuisines,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Cuisine>({
    useListHook: useCuisine,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
  });
```
`LookupCombobox`: เพิ่ม `selectedItems={selectedItems}` ใต้ `items={cuisines}`

- [ ] **Step 2: `lookup-delivery-point.tsx`**

imports: `ACTIVE_ONLY_FILTER` (รูปเดียวกับ Step 1) + `import type { DeliveryPoint } from "@/types/delivery-point";`
```ts
  const {
    items: deliveryPoints,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<DeliveryPoint>({
    useListHook: useDeliveryPoint,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={deliveryPoints}`

- [ ] **Step 3: `lookup-location.tsx`** (ชนิดคลังกรองที่ server ด้วย — `location_type|enum:` ต้องอยู่ท้าย clause)

imports: `ACTIVE_ONLY_FILTER`
แทน `const excludedSet = …` ถึงจบ `useLookupPagination<Location>({ … });` ด้วย:
```ts
  const excludedSet = excludeIds ? new Set(excludeIds) : undefined;
  // location_type|enum: ต้องอยู่ท้ายสุด — ค่า enum คั่นด้วย `,` เหมือนตัวคั่นเงื่อนไข
  const serverFilter = [
    ACTIVE_ONLY_FILTER,
    locationTypes?.length ? `location_type|enum:${locationTypes.join(",")}` : "",
  ]
    .filter(Boolean)
    .join(",");

  const {
    items: locations,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Location>({
    useListHook: useLocation,
    search,
    serverFilter,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludedSet ? (l) => !excludedSet.has(l.id) : undefined,
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={locations}` · JSDoc บรรทัด `filter \`is_active = true\` รองรับ …` แก้เป็น `กรอง \`is_active\` และ \`locationTypes\` ที่ server รองรับ …`

- [ ] **Step 4: `lookup-product.tsx`** (products ไม่มี `is_active` — ใช้ `product_status_type|string:active`)

```ts
  const {
    items: products,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Product>({
    useListHook: useProduct,
    search,
    serverFilter: "product_status_type|string:active",
    // defaultOpen = เปิด popover ทันทีตอน mount (ฟอร์มพากรอกทีละช่อง) ต้องมีรายการรอ
    enabled: hasOpened || !!defaultOpen,
    selectedIds: value ? [value] : [],
    filter: excludedSet ? (p) => !excludedSet.has(p.id) : undefined,
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={products}` · JSDoc `filter เฉพาะ \`product_status_type === "active"\`` → `กรอง \`product_status_type = active\` ที่ server` · คอมเมนต์ของ prop `defaultLabel` คงไว้

- [ ] **Step 5: `lookup-unit.tsx`**

imports: `ACTIVE_ONLY_FILTER` + `import type { Unit } from "@/types/unit";`
```ts
  const {
    items: units,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Unit>({
    useListHook: useUnit,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludedSet ? (u) => !excludedSet.has(u.id) : undefined,
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={units}` · (หน่วยที่เพิ่งสร้างจาก `UnitDialog` → `onValueChange(id)` → value ใหม่ → `selectedIds` ดึงชื่อเอง)

- [ ] **Step 6: `lookup-recipe-category.tsx`** (+ `onItemChange`)

imports: `ACTIVE_ONLY_FILTER` + `import type { RecipeCategory } from "@/types/recipe-category";`
props: เพิ่มใน interface ใต้ `readonly onValueChange: (value: string) => void;`
```ts
  /** ส่ง object เต็มของหมวดที่ผู้ใช้เพิ่งเลือก (ฟอร์มหมวดใช้คำนวณ level จากหมวดแม่) */
  readonly onItemChange?: (category: RecipeCategory) => void;
```
destructure เพิ่ม `onItemChange,` ต่อจาก `onValueChange,`
```ts
  const {
    items: categories,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<RecipeCategory>({
    useListHook: useRecipeCategory,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludeIds ? (c) => !excludeIds.has(c.id) : undefined,
  });
```
`LookupCombobox`: แทน `onValueChange={(id) => onValueChange(id)}` ด้วย
```tsx
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
```
และเพิ่ม `selectedItems={selectedItems}` ใต้ `items={categories}`

- [ ] **Step 7: `lookup-vendor.tsx`**

imports: `ACTIVE_ONLY_FILTER`
```ts
  const {
    items: vendors,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Vendor>({
    useListHook: useVendor,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludeIds ? (v) => !excludeIds.has(v.id) : undefined,
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={vendors}`

- [ ] **Step 8: `lookup-equipment-category.tsx`**

imports: `ACTIVE_ONLY_FILTER` + `import type { EquipmentCategory } from "@/types/equipment-category";`
```ts
  const {
    items: categories,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<EquipmentCategory>({
    useListHook: useEquipmentCategory,
    search,
    serverFilter: ACTIVE_ONLY_FILTER,
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
    filter: excludeIds ? (c) => !excludeIds.has(c.id) : undefined,
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={categories}`

- [ ] **Step 9: `lookup-prt.tsx`** (pricelist-templates ไม่มี `is_active` — `is_active` ได้ 500)

```ts
  const {
    items: templates,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<PriceListTemplate>({
    useListHook: usePriceListTemplate,
    search,
    // ห้ามส่ง is_active — endpoint นี้ตอบ 500 ใช้ status แทน
    serverFilter: "status|string:active",
    enabled: hasOpened,
    selectedIds: value ? [value] : [],
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={templates}`

- [ ] **Step 10: `lookup-user-location.tsx`** (แก้เฉพาะ `LookupUserLocationInner` — `LazyPlaceholder` ใช้ `defaultLabel` เหมือนเดิม)

imports: `ACTIVE_ONLY_FILTER`
แทนบล็อก `useLookupPagination<Location>({ … })` ใน `LookupUserLocationInner` ด้วย:
```ts
  // location_type|enum: ต้องอยู่ท้ายสุด — ค่า enum คั่นด้วย `,` เหมือนตัวคั่นเงื่อนไข
  const serverFilter = [
    ACTIVE_ONLY_FILTER,
    locationTypes?.length ? `location_type|enum:${locationTypes.join(",")}` : "",
  ]
    .filter(Boolean)
    .join(",");

  const {
    items: locations,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<Location>({
    useListHook: useUserLocation,
    search,
    serverFilter,
    selectedIds: value ? [value] : [],
    filter: excludeIds ? (l) => !excludeIds.has(l.id) : undefined,
  });
```
(ตัวนี้ไม่มี `hasOpened` เดิม — ไม่เพิ่ม `enabled` เพราะอยู่นอกขอบเขต spec §6) · `LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={locations}`

- [ ] **Step 11: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error
Run: `bun test:run components/lookup`
Expected: PASS
Run: `grep -n "hasOpened || !!value" components/lookup/*.tsx`
Expected: ไม่พบ

- [ ] **Step 12: ตรวจมือ** — เปิด PO ที่มี vendor อยู่ (หน้าแก้ไข) → ช่อง vendor ขึ้น `code - name` ทันที · Network มี `vendors?…filter=id%7Cstring%3A…` ไม่มีรายการหน้า 1 จนกว่าจะคลิกช่อง · คลิกช่อง → โหลดหน้า 1 (`filter=is_active|boolean:true`) · เลือก "—"/เลือกซ้ำ ยังทำงานเหมือนเดิม

- [ ] **Step 13: Commit**

```bash
git add components/lookup
git commit -m "feat(lookup): lookup ทะเบียน config 10 ตัวส่ง selectedIds ชื่อค่าที่เลือกขึ้นทันทีโดยไม่ต้องเปิด popover และกรอง active ที่ server"
```

---

### Task 3: lookup ที่ผูก parent + งวดตรวจนับ + dataset

**Files:**
- Modify: `hooks/use-location-pair-products.ts` (buildUrl params)
- Modify: `hooks/use-products-by-location.ts` (buildUrl params)
- Modify: `hooks/use-locations-by-product.ts` (buildUrl params)
- Modify: `components/lookup/lookup-grn-by-vendor-for-cn.tsx`
- Modify: `components/lookup/lookup-location-pair-product.tsx`
- Modify: `components/lookup/lookup-product-in-location.tsx`
- Modify: `components/lookup/lookup-product-location.tsx`
- Modify: `types/physical-count-period.ts`
- Modify: `components/lookup/lookup-physical-count-period.tsx` (เขียนใหม่ทั้งไฟล์)
- **ไม่แก้:** `components/lookup/lookup-dataset.tsx` — endpoint `dashboard-lab/datasets` ไม่ paginate/ไม่มี `perpage` (registry ใน code คืนทั้งชุด `{items,count}`) ไม่มี `-1` ให้ย้าย และดึงตาม id ไม่ได้ → บันทึกเป็นข้อยกเว้นใน spec §6 (Task 9)

**Interfaces:**
- Consumes: `LookupListParams` (type) จาก `@/hooks/use-entities-by-ids`, `useLookupPagination` (`selectedIds`, `idFilterKey`, `sort`)
- Produces: `PhysicalCountPeriod` รูปใหม่ `{ id; period_id; tb_inventory_period: { id; period; start_at; end_at; status }; status }` (ไม่มี `counting_period_*` แล้ว) · props สาธารณะของ lookup ทุกตัวคงเดิม

ผล probe ที่กำหนดทางเลือก (ดู Global Constraints ตาราง endpoint): ส่ง `selectedIds` เฉพาะเส้นที่ ✓ — เส้น ✗ คงหา label แบบเดิม (`items` + `defaultLabel` ที่ caller ส่ง)

- [ ] **Step 1: ส่ง `filter` ผ่าน hook ของ parent-scoped endpoint**

`hooks/use-location-pair-products.ts` — ใน object ที่สองของ `buildUrl(…)`:
```ts
        {
          perpage: params?.perpage ?? 30,
          page: params?.page,
          search: params?.search,
          // รับ `product_id|string:a,b` (ใช้ดึงสินค้าที่เลือกไว้ตาม id)
          filter: params?.filter,
        },
```
`hooks/use-products-by-location.ts` — ใน object ของ `buildUrl(…)`:
```ts
        {
          perpage: params?.perpage ?? 30,
          page: params?.page,
          search: params?.search,
          // เฉพาะเส้น workflow ที่รับ `product_id|string:` — เส้นธรรมดาเมิน filter
          filter: useWorkflow ? params?.filter : undefined,
        },
```
`hooks/use-locations-by-product.ts` — ใน object ของ `buildUrl(…)`:
```ts
        {
          perpage: params?.perpage ?? 30,
          page: params?.page,
          search: params?.search,
          // เฉพาะเส้นธรรมดา (user-locations/product) ที่รับ `id|string:` —
          // เส้น workflow-scoped เมิน filter และไม่ paginate
          filter: scoped ? undefined : params?.filter,
        },
```

- [ ] **Step 2: `lookup-grn-by-vendor-for-cn.tsx`**

import เพิ่ม `import type { LookupListParams } from "@/hooks/use-entities-by-ids";`
แทนตั้งแต่ `const useListByVendor = (` ถึงจบ `useLookupPagination<GoodsReceiveNote>({ … });` ด้วย:
```ts
  const useListByVendor = (
    params: LookupListParams,
    options?: { enabled?: boolean },
  ) => useGoodsReceiveNoteByVendorForCn(vendorId, params, options);

  const {
    items: grns,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<GoodsReceiveNote>({
    useListHook: useListByVendor,
    search,
    resetDeps: [vendorId],
    // endpoint vendor/:id/cn รับ `id|string:` (probe T02) — ใบที่เลือกไว้ขึ้นเลขเสมอ
    selectedIds: value ? [value] : [],
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={grns}`

- [ ] **Step 3: `lookup-location-pair-product.tsx`**

import เพิ่ม `import type { LookupListParams } from "@/hooks/use-entities-by-ids";`
แทนตั้งแต่ `const useListHook = (` ถึงจบ `useLookupPagination<LocationPairProduct>({ … });` ด้วย:
```ts
  const useListHook = (
    params: LookupListParams,
    options?: { enabled?: boolean },
  ) =>
    useLocationPairProducts(
      fromLocationId || undefined,
      toLocationId || undefined,
      workflowId || undefined,
      params,
      options,
    );

  const {
    items: products,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<LocationPairProduct>({
    useListHook,
    getId: (p) => p.product_id,
    search,
    resetDeps: [fromLocationId, toLocationId, workflowId],
    // แถวเป็นของตาราง product_location — ดึงตาม `product_id` (`id` ได้ 0 แถว)
    selectedIds: value ? [value] : [],
    idFilterKey: "product_id",
    filter: excludedSet
      ? (p) => !excludedSet.has(p.product_id)
      : undefined,
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={products}`

- [ ] **Step 4: `lookup-product-in-location.tsx`**

import เพิ่ม `import type { LookupListParams } from "@/hooks/use-entities-by-ids";`
แทนตั้งแต่ `const useListHook = (` ถึงจบ `useLookupPagination<ProductLookupItem>({ … });` ด้วย:
```ts
  const useListHook = (
    params: LookupListParams,
    options?: { enabled?: boolean },
  ) =>
    useProductsByLocation(locationId || undefined, params, workflowId, options);

  const {
    items: products,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<ProductLookupItem>({
    useListHook,
    search,
    // ดึงตาม id ได้เฉพาะเส้น workflow (`product_id|string:`) — เส้นธรรมดา
    // products/locations/:id เมิน filter จึงพึ่ง defaultLabel ของ caller เหมือนเดิม
    selectedIds: workflowId !== undefined && value ? [value] : [],
    idFilterKey: "product_id",
    filter: excludedSet ? (p) => !excludedSet.has(p.id) : undefined,
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={products}`

- [ ] **Step 5: `lookup-product-location.tsx`**

import เพิ่ม `import type { LookupListParams } from "@/hooks/use-entities-by-ids";`
แทนตั้งแต่ `const useListHook = (` ถึงจบ `useLookupPagination<LocationOption>({ … });` ด้วย:
```ts
  const useListHook = (
    params: LookupListParams,
    options?: { enabled?: boolean },
  ) =>
    useLocationsByProduct(productId || undefined, params, workflowId, options);

  const {
    items: locations,
    selectedItems,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
  } = useLookupPagination<LocationOption>({
    useListHook,
    search,
    // ดึงตาม id ได้เฉพาะเส้นธรรมดา (user-locations/product/:id) — เส้น workflow
    // เมิน filter และคืนทั้งชุดอยู่แล้ว จึงพึ่ง items + defaultLabel ของ caller
    selectedIds: !workflowId && value ? [value] : [],
    filter: excludedSet ? (l) => !excludedSet.has(l.id) : undefined,
  });
```
`LookupCombobox`: `selectedItems={selectedItems}` ใต้ `items={locations}`

- [ ] **Step 6: `types/physical-count-period.ts`** — แทน `interface PhysicalCountPeriod` ด้วย (คง `CreatePhysicalCountPeriodDto` ไว้ตามเดิม):

```ts
/**
 * แถวของ `GET physical-count-periods` — วันที่ของงวดอยู่ที่งวดบัญชีที่ผูก
 * (`tb_inventory_period`) ไม่มี `counting_period_*` บน wire (probe T02 2026-09-29)
 * ของเดิมอ่านฟิลด์ที่ไม่มีจริง → dropdown ว่างเสมอ
 */
export interface PhysicalCountPeriod {
  id: string;
  period_id: string;
  tb_inventory_period: {
    id: string;
    period: string;
    start_at: string;
    end_at: string;
    status: string;
  };
  status: string;
}
```

- [ ] **Step 7: เขียน `components/lookup/lookup-physical-count-period.tsx` ใหม่ทั้งไฟล์**

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { usePhysicalCountPeriod } from "@/hooks/use-physical-count-period";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { formatDate } from "@/lib/date-utils";
import type { PhysicalCountPeriod } from "@/types/physical-count-period";
import { LookupCombobox } from "./lookup-combobox";

interface LookupPhysicalCountPeriodProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (item: PhysicalCountPeriod) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly size?: "xs" | "sm" | "default";
  readonly error?: string;
}

function formatPeriodLabel(period: PhysicalCountPeriod): string {
  const from = formatDate(period.tb_inventory_period.start_at, "DD MMM YYYY");
  const to = formatDate(period.tb_inventory_period.end_at, "DD MMM YYYY");
  return `${from} — ${to}`;
}

export function LookupPhysicalCountPeriod({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  size,
  error,
}: LookupPhysicalCountPeriodProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  // Lazy: ยิงรายการตอนเปิด popover ครั้งแรก — ชื่อของค่าที่เลือกดึงตาม id แยก (selectedIds)
  const [hasOpened, setHasOpened] = useState(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<PhysicalCountPeriod>({
      useListHook: usePhysicalCountPeriod,
      // search ของ endpoint ไม่ครอบเลขงวด/วันที่ (ได้ 0 แถว) — ค้นในรายการที่โหลดมาแทน
      search: "",
      // ห้ามส่ง is_active (400) · เรียงงวดล่าสุดก่อนที่ server
      sort: "tb_inventory_period.start_at:desc",
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
      // ซ่อนงวดที่ยังไม่เริ่ม (ค่าที่เลือกไว้ผ่านเสมอ)
      filter: (p) => new Date(p.tb_inventory_period.start_at) <= today,
    });

  return (
    <LookupCombobox
      size={size}
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(p) => p.id}
      getLabel={formatPeriodLabel}
      getSearchValue={(p) =>
        `${p.tb_inventory_period.period} ${formatPeriodLabel(p)}`
      }
      placeholder={
        placeholder ?? tl("select", { entity: tfl("physicalCountPeriod") })
      }
      searchPlaceholder={tl("search", { entity: tfl("physicalCountPeriod") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={error}
    />
  );
}
```
(ไม่ส่ง `serverSideSearch` → `LookupCombobox` กรองคำค้นในรายการที่โหลดแล้วเอง)

- [ ] **Step 8: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error — ถ้า tsc แดงที่ `counting_period_from_date` แปลว่ามีผู้อ่านฟิลด์เก่าหลงเหลือ (ตอนเขียนแผนมีแค่ใน lookup นี้)
Run: `bun test:run components hooks`
Expected: PASS
Run: `grep -rn "perpage.\{0,6\}-1" components/lookup`
Expected: ไม่พบ

- [ ] **Step 9: ตรวจมือ**
1. `/inventory-management/physical-count` → dropdown งวดตรวจนับมีรายการ (เดิมว่างเสมอ) เรียงล่าสุดก่อน label เป็น `01 May 2026 — 31 May 2026`
2. CN ใหม่: เลือก vendor → เลือก GRN ที่อยู่หน้า 2 (เลื่อนลง) → ปิด/เปิดฟอร์มแก้ไข → ช่อง GRN ขึ้นเลขทันที (request `filter=id|string:`)
3. SR ใหม่ (workflow ชนิด store_requisition, T02 workflow "General"): เลือกคลังคู่ + สินค้าหลังหน้าแรก → ช่องสินค้ายังขึ้นชื่อหลังรายการรีเฟรช (request มี `filter=product_id|string:`)

- [ ] **Step 10: Commit**

```bash
git add hooks/use-location-pair-products.ts hooks/use-products-by-location.ts hooks/use-locations-by-product.ts components/lookup types/physical-count-period.ts
git commit -m "feat(lookup): lookup ที่ผูก parent ดึงค่าที่เลือกตาม id เมื่อ endpoint รองรับ + แก้ dropdown งวดตรวจนับที่ว่างเสมอ"
```

---
### Task 4: ตัวกรองหน้า list (สินค้า · ผู้ขาย · สูตร · หมวดสูตร · อุปกรณ์ · IA · RFP · price list) → `entity` + ชื่อในตารางสูตร/อุปกรณ์

**Files (Modify):**
- `routes/product-management/product/pd-component.tsx` (L18-20, L29, L61-168)
- `routes/vendor-management/vendor/vendor-component.tsx` (L20, L28, L59-104)
- `routes/operation-plan/recipe/recipe-component.tsx` (imports, L61-78, L130-167, L192-195, L291-293)
- `routes/operation-plan/category/recipe-category-component.tsx` (imports, L60-71, L100-117, L144-146, L241-244)
- `routes/operation-plan/category/use-recipe-category-table.tsx` (interface, destructure, cell parent)
- `routes/operation-plan/equipment/eq-component.tsx` (imports, L56-70, L100-115, หลัง `equipments`)
- `routes/inventory-management/inventory-adjustment/ia-component.tsx` (L40-41, L76-87, L117-130, deps L151)
- `routes/vendor-management/request-price-list/rfp-component.tsx` (L25, L33, L67-99, deps)
- `routes/vendor-management/price-list/pl-component.tsx` (L23, L59-75, field `currency`, deps)

**Interfaces:**
- Consumes (Task 1): `defineEntitySource<T>()` จาก `@/components/filter/entity-filter-source`, `FilterFieldDef` member `{ control: "entity"; entity }` · `useEntitiesByIds<T>({ useListHook, ids, idFilterKey?, enabled? }) → { items: T[]; isLoading }`
- Produces: ไม่มี (ใช้ภายในหน้า) · `useRecipeCategoryTable` **เลิกรับ** `allCategories`

ค่า `value` ที่ต้องคงไว้ (URL/saved view ผูกอยู่) — ทุกตัวเดิมเป็น `custom` + `MultiSelectFilter` ที่เก็บรูป `<col>|string:<id>` ต่อค่า (เลือกหลายค่า = ซ้ำ prefix) · `EntityMultiFilter` อ่านรูปเก่าได้ (Task 1 Step 2) และ backend ตีความสองรูปเท่ากัน

| หน้า | key | fieldKey | getId / idFilterKey | label | serverFilter |
|---|---|---|---|---|---|
| product | `category` / `sub_category` / `item_group` | `product_category_id` / `product_sub_category_id` / `product_item_group_id` | id | name | active (default) |
| vendor | `business_type` | `business_type_id` | id | name | active |
| recipe | `cuisine` / `category` | `cuisine_id` / `category_id` | id | name | active |
| recipe category | `parent` | `parent_id` | id | name | active |
| equipment | `category` | `category_id` | id | name | active |
| IA | `adjustment_type` | `adjustment_type_id` | id | `code - name` | **`null`** (เดิมไม่กรอง) |
| RFP | `template` | `pricelist_template_id` | id | name | **`null`** (เดิมไม่กรอง) |
| price list | `currency` | `currency_code` | **`code` / `"code"`** (ค่าที่เก็บคือรหัสสกุล ไม่ใช่ id) | code | active |

> การตัดสินใจ IA / RFP: spec §3.5 ตารางเขียน active / `status|string:active` แต่ประโยคกติกาใต้ตารางบอก "ตัวที่เดิมไม่กรองให้ใส่ null" — โค้ดเดิมของสองหน้านี้**ไม่กรอง** และหน้า list ต้องกรองเอกสารเก่าที่อ้างประเภท/template ที่ถูกปิดไปแล้วได้ จึงใช้ `null` (บันทึกใน spec ที่ Task 9)

- [ ] **Step 1: `pd-component.tsx`**

imports: ลบ `import { MultiSelectFilter } from "@/components/ui/multi-select-filter";` · เพิ่ม
```ts
import { defineEntitySource } from "@/components/filter/entity-filter-source";
import type { CategoryDto, ItemGroupDto, SubCategoryDto } from "@/types/category";
```
(คง `useCategory` / `useSubCategory` / `useItemGroup` ไว้ — ใช้เป็น `useListHook`)

เพิ่มเหนือ `export default function ProductComponent()`:
```ts
const CATEGORY_ENTITY = defineEntitySource<CategoryDto>({
  fieldKey: "product_category_id",
  useListHook: useCategory,
  getLabel: (c) => c.name,
});
const SUB_CATEGORY_ENTITY = defineEntitySource<SubCategoryDto>({
  fieldKey: "product_sub_category_id",
  useListHook: useSubCategory,
  getLabel: (c) => c.name,
});
const ITEM_GROUP_ENTITY = defineEntitySource<ItemGroupDto>({
  fieldKey: "product_item_group_id",
  useListHook: useItemGroup,
  getLabel: (c) => c.name,
});
```
ลบ L61-98 (`useCategory({ perpage: -1 })` สามตัว + `categoryFilterOptions` / `subCategoryFilterOptions` / `itemGroupFilterOptions`) · แทนคอมเมนต์ L100-106 ด้วย:
```ts
  // category/sub_category/item_group เป็น 3 filter อิสระต่อกัน (ไม่มี cascade) —
  // control "entity" ค้นที่ server โหลดทีละหน้าตอนเปิด และ chip ดึงชื่อตาม id เอง
```
แทน 3 field `category` / `sub_category` / `item_group` ด้วย:
```ts
      {
        key: "category",
        control: "entity",
        entity: CATEGORY_ENTITY,
        labelKey: "field.category",
        section: "listView.sectionCategory",
      },
      {
        key: "sub_category",
        control: "entity",
        entity: SUB_CATEGORY_ENTITY,
        labelKey: "field.subCategory",
        section: "listView.sectionCategory",
      },
      {
        key: "item_group",
        control: "entity",
        entity: ITEM_GROUP_ENTITY,
        labelKey: "field.itemGroup",
        section: "listView.sectionCategory",
      },
```
deps ของ `productFilterFields`: `[categoryFilterOptions, subCategoryFilterOptions, itemGroupFilterOptions]` → `[]`

- [ ] **Step 2: `vendor-component.tsx`**

imports: ลบ `MultiSelectFilter` · เพิ่ม `defineEntitySource` + `import type { BusinessType } from "@/types/business-type";`
เหนือ `export default function VendorComponent()`:
```ts
const BUSINESS_TYPE_ENTITY = defineEntitySource<BusinessType>({
  fieldKey: "business_type_id",
  useListHook: useBusinessType,
  getLabel: (bt) => bt.name,
});
```
ลบ L59-71 (`btData` + `btFilterOptions`) · แทนคอมเมนต์ L73-79 ด้วย:
```ts
  // filter (status) ไม่ส่ง options — ใช้ default is_active|bool:true/false ของ
  // StatusFilter · business_type เป็น control "entity" (ค้นที่ server, chip ขึ้นชื่อ)
```
แทน field `business_type` ด้วย:
```ts
      {
        key: "business_type",
        section: "listView.sectionDocument",
        control: "entity",
        entity: BUSINESS_TYPE_ENTITY,
        labelKey: "field.businessType",
      },
```
deps `[btFilterOptions]` → `[]`

- [ ] **Step 3: `recipe-component.tsx`** (ตัวกรอง + ชื่อ cuisine/หมวดของแถวในหน้า)

imports: เพิ่ม
```ts
import { defineEntitySource } from "@/components/filter/entity-filter-source";
import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";
import type { Cuisine } from "@/types/cuisine";
import type { RecipeCategory } from "@/types/recipe-category";
```
(คง `MultiSelectFilter` — ยังใช้กับ difficulty)
เหนือ `export default function RecipeComponent()`:
```ts
const CUISINE_ENTITY = defineEntitySource<Cuisine>({
  fieldKey: "cuisine_id",
  useListHook: useCuisine,
  getLabel: (c) => c.name,
});
const RECIPE_CATEGORY_ENTITY = defineEntitySource<RecipeCategory>({
  fieldKey: "category_id",
  useListHook: useRecipeCategory,
  getLabel: (c) => c.name,
});
```
ลบ L61-78 (`cuisineData` / `categoryData` + `cuisineFilterOptions` / `categoryFilterOptions`) · แทน field `cuisine` และ `category` ด้วย:
```ts
      {
        key: "cuisine",
        control: "entity",
        entity: CUISINE_ENTITY,
        labelKey: "field.cuisine",
        section: "listView.sectionCategory",
      },
      {
        key: "category",
        control: "entity",
        entity: RECIPE_CATEGORY_ENTITY,
        labelKey: "field.category",
        section: "listView.sectionCategory",
      },
```
deps ของ `recipeFilterFields`:
```ts
    [STATUS_OPTIONS, difficultyFilterOptions, tfl],
```
แก้คอมเมนต์เหนือ `recipeFilterFields` (L97-100) เป็น:
```ts
  // difficulty/status เป็น label literal จึงห่อ custom · cuisine/category เป็น
  // control "entity" (ค้นที่ server, chip ขึ้นชื่อ)
```
ต่อจากบล็อก `const totalRecords = …;` เพิ่ม:
```ts
  // ชื่อ cuisine/หมวดของแถวในหน้านี้เท่านั้น (ดึงตาม id) — ไม่ลากทะเบียนทั้ง BU
  const { items: cuisines } = useEntitiesByIds<Cuisine>({
    useListHook: useCuisine,
    ids: recipes.map((r) => r.cuisine_id),
  });
  const { items: recipeCategories } = useEntitiesByIds<RecipeCategory>({
    useListHook: useRecipeCategory,
    ids: recipes.map((r) => r.category_id),
  });
```
ใน `useRecipeTable({ … })`: `cuisines: cuisineData?.data ?? [],` → `cuisines,` · `categories: categoryData?.data ?? [],` → `categories: recipeCategories,`
ใน `<RecipeCard …>`: `cuisines={cuisineData?.data ?? []}` → `cuisines={cuisines}` · `categories={categoryData?.data ?? []}` → `categories={recipeCategories}`
(ระหว่างโหลดตาราง/การ์ดแสดง `—` ของเดิม — ไม่มี id ดิบ)

- [ ] **Step 4: `recipe-category-component.tsx` + `use-recipe-category-table.tsx`** (แถวมี `parent: {id, name}` อยู่แล้ว — ไม่ต้องดึงชื่อ)

`recipe-category-component.tsx` imports: ลบ `MultiSelectFilter` · เพิ่ม `import { defineEntitySource } from "@/components/filter/entity-filter-source";`
เหนือ `export default function RecipeCategoryComponent()`:
```ts
const PARENT_ENTITY = defineEntitySource<RecipeCategory>({
  fieldKey: "parent_id",
  useListHook: useRecipeCategory,
  getLabel: (c) => c.name,
});
```
ลบ L60-71 (`allData`, `allCategories`, `parentMap`, `parentFilterOptions`) · แทนคอมเมนต์ L81-83 ด้วย `// parent เป็น control "entity" (ค้นที่ server, chip ขึ้นชื่อ)` · แทน field `parent`:
```ts
      {
        key: "parent",
        section: "listView.sectionCategory",
        control: "entity",
        entity: PARENT_ENTITY,
        labelKey: "field.parent",
      },
```
deps `[STATUS_OPTIONS, parentFilterOptions, tfl]` → `[STATUS_OPTIONS]` (ถ้า `tfl` ไม่ถูกใช้ที่อื่นแล้ว lint จะไม่เตือนเพราะเป็น deps ที่ขาดไม่ใช่เกิน — แต่ถ้า `tfl` กลายเป็นตัวแปรไม่ถูกใช้ ให้ลบ `const tfl = useTranslations("field");` ด้วย: ตรวจ `grep -n "tfl(" recipe-category-component.tsx`)
`useRecipeCategoryTable({ … })`: ลบบรรทัด `allCategories,`
`<RecipeCategoryCard …>`: แทน
```tsx
                  parentName={
                    item.parent?.id ? parentMap.get(item.parent.id) : undefined
                  }
```
ด้วย `parentName={item.parent?.name ?? undefined}`

`use-recipe-category-table.tsx`: ลบ `allCategories: RecipeCategory[];` ใน interface และ `allCategories,` ใน destructure · แทน cell ของคอลัมน์ `parent_id`:
```tsx
      cell: ({ row }) => {
        const parentId = row.original.parent?.id;
        if (!parentId) return <span className="text-muted-foreground">—</span>;
        const parent = allCategories.find((c) => c.id === parentId);
        return parent?.name ?? row.original.parent?.name ?? parentId;
      },
```
ด้วย:
```tsx
      cell: ({ row }) =>
        row.original.parent?.name || (
          <span className="text-muted-foreground">—</span>
        ),
```

- [ ] **Step 5: `eq-component.tsx`** (ตัวกรอง + ชื่อหมวดของแถวในหน้า)

imports: ลบ `MultiSelectFilter` · เพิ่ม
```ts
import { defineEntitySource } from "@/components/filter/entity-filter-source";
import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";
import type { EquipmentCategory } from "@/types/equipment-category";
```
เหนือ component:
```ts
const EQUIPMENT_CATEGORY_ENTITY = defineEntitySource<EquipmentCategory>({
  fieldKey: "category_id",
  useListHook: useEquipmentCategory,
  getLabel: (c) => c.name,
});
```
ลบ `const { data: categoryData } = useEquipmentCategory({ perpage: -1 });`, บล็อก `const categories = new Map(…)` และ `categoryFilterOptions` · แทนคอมเมนต์เหนือ `equipmentFilterFields` ด้วย `// category เป็น control "entity" (ค้นที่ server, chip ขึ้นชื่อ)` · แทน field `category`:
```ts
      {
        key: "category",
        section: "listView.sectionCategory",
        control: "entity",
        entity: EQUIPMENT_CATEGORY_ENTITY,
        labelKey: "field.category",
      },
```
deps `[STATUS_OPTIONS, categoryFilterOptions, tfl]` → `[STATUS_OPTIONS]` (ตรวจ `tfl` เหมือน Step 4)
ต่อจาก `const totalRecords = …;` เพิ่ม:
```ts
  // ชื่อหมวดของแถวในหน้านี้เท่านั้น (ดึงตาม id)
  const { items: categoryItems } = useEntitiesByIds<EquipmentCategory>({
    useListHook: useEquipmentCategory,
    ids: equipments.map((e) => e.category_id ?? ""),
  });
  const categories = new Map(categoryItems.map((c) => [c.id, c.name]));
```
(`useEquipmentTable({ categories, … })` และ `categories.get(item.category_id)` ของการ์ดใช้ต่อได้ไม่ต้องแก้)

- [ ] **Step 6: `ia-component.tsx`**

imports: ลบ `MultiSelectFilter` (ตรวจก่อน: `grep -n "MultiSelectFilter" ia-component.tsx` ต้องเหลือแค่ import) · เพิ่ม `defineEntitySource` + `import type { AdjustmentType } from "@/types/adjustment-type";` (คง `useAdjustmentType`)
เหนือ component:
```ts
// ไม่กรอง is_active — หน้า list ต้องกรองใบเก่าที่อ้างประเภทที่ถูกปิดไปแล้วได้
const ADJUSTMENT_TYPE_ENTITY = defineEntitySource<AdjustmentType>({
  fieldKey: "adjustment_type_id",
  useListHook: useAdjustmentType,
  getLabel: (at) => `${at.code} - ${at.name}`,
  serverFilter: null,
});
```
แทนคอมเมนต์ + บล็อก L76-87 (`// ตัวกรองประเภทการปรับปรุง …` ถึงจบ `adjustmentTypeOptions`) ด้วย:
```ts
  // ตัวกรองประเภทการปรับปรุง (adjustment type ของ BU เช่น EOP-IN, FN) แยกจากตัวกรอง
  // Type (SI/SO) ข้างล่าง — control "entity" ค้นที่ server โหลดทีละหน้า
  // เลือกหลายตัว = `adjustment_type_id|string:a,b` (IN)
```
แทน field `adjustment_type`:
```ts
      {
        key: "adjustment_type",
        section: "listView.sectionDocument",
        control: "entity",
        entity: ADJUSTMENT_TYPE_ENTITY,
        labelKey: "field.adjustmentType",
      },
```
deps `[ts, tfl, adjustmentTypeOptions]` → `[ts, tfl]`

- [ ] **Step 7: `rfp-component.tsx`**

imports: ลบ `MultiSelectFilter` (ตรวจแบบ Step 6) · เพิ่ม `defineEntitySource` + `import type { PriceListTemplate } from "@/types/price-list-template";` (คง `usePriceListTemplate`)
เหนือ component:
```ts
// ไม่กรองสถานะ — หน้า list ต้องกรอง RFP เก่าที่อ้าง template ที่ปิดไปแล้วได้
const TEMPLATE_ENTITY = defineEntitySource<PriceListTemplate>({
  fieldKey: "pricelist_template_id",
  useListHook: usePriceListTemplate,
  getLabel: (tmpl) => tmpl.name,
  serverFilter: null,
});
```
ลบ L67-77 (`templateData` + `templateOptions`) · แทนคอมเมนต์ L78-81 ด้วย `// มีแค่ template (control "entity") กับช่วงวันที่` · แทน field `template`:
```ts
      {
        key: "template",
        section: "listView.sectionDocument",
        control: "entity",
        entity: TEMPLATE_ENTITY,
        labelKey: "field.template",
      },
```
deps `[templateOptions]` → `[]`

- [ ] **Step 8: `pl-component.tsx`** (ค่าที่เก็บคือ **รหัส** สกุลเงิน)

imports: เพิ่ม `defineEntitySource` + `import type { Currency } from "@/types/currency";` (คง `useCurrency`, คง `MultiSelectFilter` — status ยังใช้)
เหนือ component:
```ts
// ค่าที่ URL เก็บคือรหัสสกุล (`currency_code|string:THB,USD`) ไม่ใช่ id — ดึงชื่อตาม `code`
const CURRENCY_ENTITY = defineEntitySource<Currency>({
  fieldKey: "currency_code",
  useListHook: useCurrency,
  getId: (c) => c.code,
  getLabel: (c) => c.code,
  idFilterKey: "code",
});
```
ลบคอมเมนต์ L59-63 + L64-75 (`currencyData` + `currencyOptions`) · แทน field `currency`:
```ts
      {
        key: "currency",
        control: "entity",
        entity: CURRENCY_ENTITY,
        labelKey: "field.currency",
        section: "listView.sectionDocument",
      },
```
deps `[currencyOptions, statusOptions]` → `[statusOptions]`

- [ ] **Step 9: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error (ถ้า lint เตือน unused `tfl`/`useMemo` ให้ลบตัวที่ไม่ถูกใช้)
Run: `bun test:run routes/product-management routes/vendor-management routes/operation-plan routes/inventory-management/inventory-adjustment`
Expected: PASS
Run: `grep -n "perpage: -1" routes/product-management/product/pd-component.tsx routes/vendor-management/vendor/vendor-component.tsx routes/operation-plan/recipe/recipe-component.tsx routes/operation-plan/category/recipe-category-component.tsx routes/operation-plan/equipment/eq-component.tsx routes/inventory-management/inventory-adjustment/ia-component.tsx routes/vendor-management/request-price-list/rfp-component.tsx routes/vendor-management/price-list/pl-component.tsx`
Expected: ไม่พบ

- [ ] **Step 10: ตรวจมือ**
1. product list: เปิดตัวกรอง category → request `product-categories?perpage=30&page=1&filter=is_active|boolean:true`, พิมพ์ค้น → `search=` ที่ server, เลื่อนลง → `page=2`
2. เปิด URL รูปเก่า `/product-management/product?category=product_category_id%7Cstring%3A<A>%2Cproduct_category_id%7Cstring%3A<B>` (A,B = id หมวดจริงสองตัว) → chip `<ชื่อA> +1`, popover ติ๊กครบสองตัว, ตารางมีผลเท่ากับก่อนแก้ · ติ๊กออกหนึ่งตัว → URL เป็น `product_category_id|string:<B>`
3. price list: ตัวกรองสกุลเงิน chip ขึ้น `THB` · recipe list: คอลัมน์ cuisine/หมวด ขึ้นชื่อ · recipe category list: คอลัมน์ parent ขึ้นชื่อ

- [ ] **Step 11: Commit**

```bash
git add routes/product-management/product/pd-component.tsx routes/vendor-management/vendor/vendor-component.tsx routes/operation-plan routes/inventory-management/inventory-adjustment/ia-component.tsx routes/vendor-management/request-price-list/rfp-component.tsx routes/vendor-management/price-list/pl-component.tsx
git commit -m "feat(list-filter): ตัวกรองหมวด/ประเภท/template/สกุลเงินของหน้า list สินค้า ผู้ขาย สูตร อุปกรณ์ IA RFP price list ใช้ entity และชื่อในตารางดึงตาม id"
```

---

### Task 5: ตัวกรองแผนก (ผู้ใช้) · คลัง (SR) · ผู้ใช้ (log) · เลขที่ใบแจ้งหนี้ (GRN)

**Files:**
- Modify: `routes/system-admin/user/user-component.tsx` (L35, L54-73)
- Delete: `routes/system-admin/user/user-department-filter.tsx`
- Modify: `routes/store-operation/store-requisition/sr-component.tsx` (L45-46, field `from_location` / `to_location`)
- Delete: `routes/store-operation/store-requisition/sr-filter-from-location.tsx`, `routes/store-operation/store-requisition/sr-filter-to-location.tsx`
- Modify: `routes/system-admin/activity-log/activity-log-component.tsx` (L26, L98, L105-112, field `actor_id`, deps)
- Modify: `routes/system-admin/user-activity/user-activity-component.tsx` (L26, L57, L64-71, field `actor_id`, deps)
- Modify: `routes/procurement/goods-receive-note/grn-invoice-filter.tsx` (เขียนใหม่ทั้งไฟล์ — ค่าที่เก็บคงเดิม)
- Modify: `routes/procurement/goods-receive-note/grn-component.tsx` (คอมเมนต์เหนือ field `invoice_no`)

**Interfaces:**
- Consumes (Task 1): `defineEntitySource`, `EntityFilterSource.bareIds`, `useLookupPagination` (`sort`, `perpage`)
- Produces: ไม่มี

ค่า `value` ที่ต้องคงไว้:

| หน้า | key | ค่าเดิม | entity |
|---|---|---|---|
| user | `filter` | `department_id|string:<id>` (เดิมเลือกได้ค่าเดียว) | fieldKey `department_id`, label `code - name`, active — **เปลี่ยนเป็นเลือกหลายค่า** (users รับ IN: probe 6+3=9) ค่าเดียวเดิมยังอ่านได้ |
| SR | `from_location` | `from_location_id|string:a,b` | active + `location_type|enum:inventory,consignment` (ตามที่ไฟล์เดิมกรอง) |
| SR | `to_location` | `to_location_id|string:a,b` | active |
| activity log / user activity | `actor_id` | `a,b` (id เปล่า ส่งเป็น query param `actor_id=`) | `bareIds: true`, useUser, getId `user_id`, idFilterKey `user_id`, serverFilter `null` |
| GRN | `invoice_no` | `invoice_no|string:INV-1,INV-2` (เลขที่ ไม่ใช่ id) | **ไม่ใช้ entity** — คงคอมโพเนนต์เดิม เปลี่ยนแหล่งรายการเป็นโหลดทีละหน้า |

> spec §4 ระบุ activity-log / user-activity ต้องแปลง `user_id` → ชื่อผู้กระทำของแถว — ตรวจแล้วแถวของทั้งสอง endpoint มี `actor_firstname/middlename/lastname/username` มาแล้ว (`use-activity-log-table.tsx:75-80`, `use-user-activity-table.tsx:62-71`) ทะเบียนผู้ใช้ทั้งก้อนถูกใช้ทำตัวเลือกของตัวกรองอย่างเดียว → งาน id→ชื่อของสองหน้านี้**ไม่มีอะไรต้องทำ** (บันทึกใน spec ที่ Task 9)

- [ ] **Step 1: `user-component.tsx` + ลบ `user-department-filter.tsx`**

imports: ลบ `import { UserDepartmentFilter } from "./user-department-filter";` · เพิ่ม
```ts
import { defineEntitySource } from "@/components/filter/entity-filter-source";
import { useDepartment } from "@/hooks/use-department";
import type { Department } from "@/types/department";
```
เหนือ component:
```ts
// แผนกของผู้ใช้ — `department_id|string:a,b` (users รับ IN) ค่าเดียวของ saved view เดิมอ่านได้
const USER_DEPARTMENT_ENTITY = defineEntitySource<Department>({
  fieldKey: "department_id",
  useListHook: useDepartment,
  getLabel: (d) => `${d.code} - ${d.name}`,
});
```
แทนคอมเมนต์ L54-60 + `userFilterFields` ทั้งก้อนด้วย:
```ts
  // แผนก = control "entity" — ทะเบียนยิงตอนเปิดตัวกรองเท่านั้น (ค้นที่ server
  // โหลดทีละหน้า) chip ดึงชื่อตาม id · เดิมเลือกได้ค่าเดียว ตอนนี้หลายค่า
  const userFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "filter",
        section: "listView.sectionDocument",
        control: "entity",
        entity: USER_DEPARTMENT_ENTITY,
        labelKey: "systemAdmin.user.department",
      },
    ],
    [],
  );
```
Run: `git rm routes/system-admin/user/user-department-filter.tsx`

- [ ] **Step 2: `sr-component.tsx` + ลบตัวกรองคลังเฉพาะทาง**

imports: ลบสองบรรทัด `SrFilterFromLocation` / `SrFilterToLocation` · เพิ่ม
```ts
import { defineEntitySource } from "@/components/filter/entity-filter-source";
import { ACTIVE_ONLY_FILTER } from "@/hooks/use-lookup-pagination";
import { useConfigLocation } from "@/hooks/use-location";
import type { Location } from "@/types/location";
```
(`DEPARTMENT_ENTITY, requesterEntity` จาก Task 1 มีอยู่แล้ว)
เหนือ component:
```ts
// คลังต้นทางของใบเบิกเป็นได้แค่ inventory/consignment (กติกาเดิมของตัวกรองนี้)
// location_type|enum: ต้องอยู่ท้าย clause — ค่า enum คั่นด้วย `,`
const FROM_LOCATION_ENTITY = defineEntitySource<Location>({
  fieldKey: "from_location_id",
  useListHook: useConfigLocation,
  getLabel: (l) => `${l.code} - ${l.name}`,
  serverFilter: `${ACTIVE_ONLY_FILTER},location_type|enum:inventory,consignment`,
});
const TO_LOCATION_ENTITY = defineEntitySource<Location>({
  fieldKey: "to_location_id",
  useListHook: useConfigLocation,
  getLabel: (l) => `${l.code} - ${l.name}`,
});
```
แทน field `from_location` / `to_location` (สองก้อน `control: "custom"` + `render: … <SrFilterFromLocation …/>`) ด้วย:
```ts
      {
        key: "from_location",
        control: "entity",
        entity: FROM_LOCATION_ENTITY,
        labelKey: "field.fromLocation",
        section: "listView.sectionLocation",
      },
      {
        key: "to_location",
        control: "entity",
        entity: TO_LOCATION_ENTITY,
        labelKey: "field.toLocation",
        section: "listView.sectionLocation",
      },
```
Run: `git rm routes/store-operation/store-requisition/sr-filter-from-location.tsx routes/store-operation/store-requisition/sr-filter-to-location.tsx`

- [ ] **Step 3: `activity-log-component.tsx`**

imports: ลบ `import { useAllUsers } from "@/hooks/use-all-users";` · เพิ่ม
```ts
import { defineEntitySource } from "@/components/filter/entity-filter-source";
import { useUser } from "@/hooks/use-user";
import type { User } from "@/types/workflows";
```
(คง `getUserFullName`, คง `MultiSelectFilter` — action/entity_type ยังใช้)
เหนือ component:
```ts
// actor_id ส่งเป็น query param แยก (`actor_id=a,b`) ไม่ใช่ clause ของ filter —
// ค่า URL จึงเป็น id เปล่า (bareIds) · users ห้ามส่ง is_active (ได้ 0 แถว)
const ACTOR_ENTITY = defineEntitySource<User>({
  fieldKey: "actor_id",
  useListHook: useUser,
  getId: (u) => u.user_id,
  getLabel: getUserFullName,
  idFilterKey: "user_id",
  serverFilter: null,
  bareIds: true,
});
```
ลบ `const { data: allUsers = [] } = useAllUsers();` และบล็อก `const userOptions = useMemo(…);` · แก้คอมเมนต์เหนือ `activityLogFilterFields` บรรทัด `// action/entity_type/actor_id เป็น literal string/ชื่อผู้ใช้จริง (ไม่ใช่ i18n` … ให้ขึ้นต้นว่า `// action/entity_type เป็น literal string (ไม่ใช่ i18n key) จึงห่อ custom · actor_id เป็น\n  // control "entity" แบบ bareIds —` แล้วคงประโยคเรื่อง query param แยกไว้ · แทน field `actor_id`:
```ts
      {
        key: "actor_id",
        section: "listView.sectionPeople",
        control: "entity",
        entity: ACTOR_ENTITY,
        labelKey: "systemAdmin.activityLog.user",
      },
```
deps `[t, userOptions]` → `[t]`
(`queryParams` ที่อ่าน `lf.values.actor_id` ตรง ๆ ไม่ต้องแก้ — ค่ายังเป็น `a,b`)

- [ ] **Step 4: `user-activity-component.tsx`**

imports: ลบ `useAllUsers` · เพิ่ม `defineEntitySource`, `useUser`, `type User` (รูปเดียวกับ Step 3) · คง `getUserFullName`, `MultiSelectFilter`
เหนือ component: `ACTOR_ENTITY` ตัวเดียวกับ Step 3 ทุกตัวอักษร (คนละโมดูลย่อยของ system-admin แต่ประกาศซ้ำในไฟล์ — ไม่ย้ายไป shared เพราะสองบรรทัดคอมเมนต์ + 9 บรรทัด ไม่คุ้มกับการสร้างไฟล์ใหม่):
```ts
// actor_id ส่งเป็น query param แยก (`actor_id=a,b`) ไม่ใช่ clause ของ filter —
// ค่า URL จึงเป็น id เปล่า (bareIds) · users ห้ามส่ง is_active (ได้ 0 แถว)
const ACTOR_ENTITY = defineEntitySource<User>({
  fieldKey: "actor_id",
  useListHook: useUser,
  getId: (u) => u.user_id,
  getLabel: getUserFullName,
  idFilterKey: "user_id",
  serverFilter: null,
  bareIds: true,
});
```
ลบ `const { data: allUsers = [] } = useAllUsers();` และ `userOptions` · แทน field `actor_id`:
```ts
      {
        key: "actor_id",
        section: "listView.sectionPeople",
        control: "entity",
        entity: ACTOR_ENTITY,
        labelKey: "systemAdmin.userActivity.user",
      },
```
deps `[t, userOptions]` → `[t]`

- [ ] **Step 5: เขียน `grn-invoice-filter.tsx` ใหม่ทั้งไฟล์** (ค่าที่เก็บคงรูป `invoice_no|string:…`)

```tsx
import { useTranslations } from "use-intl";
import { useContext, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandInput } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { FilterInlineContext } from "@/components/ui/filter-inline-context";
import { VirtualCommandList } from "@/components/ui/virtual-command-list";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useGoodsReceiveNote } from "@/hooks/use-goods-receive-note";
import { useLookupPagination } from "@/hooks/use-lookup-pagination";
import { cn } from "@/lib/utils";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";

interface GrnInvoiceFilterProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

const PREFIX = "invoice_no|string:";

const ROW_CLASS = cn(
  "relative flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs select-none",
  "hover:bg-accent hover:text-accent-foreground",
);

/**
 * ตัวกรองเลขที่ใบแจ้งหนี้ของหน้า GRN — ค่าที่ส่งออกเป็น clause
 * `invoice_no|string:INV-001,INV-002`
 *
 * ตัวเลือกมาจากใบรับของ (distinct `invoice_no`) — ยิงตอนเปิด popover เท่านั้น
 * ค้นที่ server (search ของ GRN ครอบทั้ง invoice_no และ grn_no) เรียงตามเลขที่
 * ใบแจ้งหนี้ แล้วเลื่อนโหลดทีละหน้า — ใบที่ไม่มีเลขที่ (null) ตกไปท้ายสุดเอง
 * ค่าที่เก็บ *คือ* ป้ายอยู่แล้ว (ไม่ใช่ id) ปุ่มและ chip จึงพูดค่าได้โดยไม่ต้องรอโหลด
 *
 * อยู่ใต้ route ของ GRN ไม่ใช่ `components/filter/` เพราะผูกกับ
 * `useGoodsReceiveNote` ตัวเดียว — ไม่มีหน้าอื่นใช้ได้
 */
export function GrnInvoiceFilter({
  value,
  onChange,
  className,
}: GrnInvoiceFilterProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 150);
  const inline = useContext(FilterInlineContext);
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const { items: grns, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<GoodsReceiveNote>({
      useListHook: useGoodsReceiveNote,
      search: debouncedSearch,
      // หลายใบอ้างใบแจ้งหนี้เดียวกันได้ — หน้าละ 50 ใบให้ได้เลขที่พอล้นกล่อง
      // (VirtualCommandList โหลดหน้าถัดไปเมื่อเลื่อนถึงท้ายเท่านั้น)
      perpage: 50,
      sort: "invoice_no:asc",
      // inline (submenu ของ ListFilterMenu) ไม่มีจังหวะ "เปิด popover" — fetch เลย
      enabled: open || inline,
    });

  // Parse filter value (format: "invoice_no|string:INV-001,INV-002")
  const selected = (() => {
    if (!value) return new Set<string>();
    const match = /invoice_no\|string:(.+)/.exec(value);
    if (!match) return new Set<string>();
    return new Set(match[1].split(","));
  })();

  // distinct ตามลำดับของ server (เรียงเลขที่แล้ว)
  const invoiceNos = (() => {
    const seen = new Set<string>();
    for (const g of grns) {
      const no = g.invoice_no?.trim();
      if (no) seen.add(no);
    }
    return [...seen];
  })();

  // ที่เลือกไว้อยู่บนสุดเสมอ — ยกเลิกได้แม้ไม่อยู่ในหน้าที่โหลดมา
  const rows = [
    ...selected,
    ...invoiceNos.filter((no) => !selected.has(no)),
  ];

  const handleToggle = (no: string) => {
    const next = new Set(selected);
    if (next.has(no)) {
      next.delete(no);
    } else {
      next.add(no);
    }
    onChange(next.size === 0 ? "" : `${PREFIX}${Array.from(next).join(",")}`);
  };

  const selectedCount = selected.size;
  const firstNo = [...selected][0];
  const valueText =
    selectedCount > 0
      ? `${firstNo}${selectedCount > 1 ? ` +${selectedCount - 1}` : ""}`
      : tfl("invoiceNo");

  const list = (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={tfl("invoiceNo")}
        className="placeholder:text-xs"
        value={search}
        onValueChange={setSearch}
      />
      <div className="p-1">
        <label className={ROW_CLASS}>
          <Checkbox
            checked={selectedCount === 0}
            onCheckedChange={() => onChange("")}
          />
          <span className="truncate">{tc("all")}</span>
        </label>
        {isLoading ? (
          <div className="text-muted-foreground px-2 py-1.5 text-xs">
            {tc("loading")}
          </div>
        ) : (
          <VirtualCommandList
            items={rows}
            maxHeight={240}
            estimateSize={28}
            onLoadMore={loadMore}
            hasMore={hasMore}
            isLoadingMore={isLoadingMore}
            emptyMessage={
              <span className="text-muted-foreground text-xs">
                {tc("noSearchResult")}
              </span>
            }
          >
            {(no) => (
              <label key={no} className={ROW_CLASS}>
                <Checkbox
                  checked={selected.has(no)}
                  onCheckedChange={() => handleToggle(no)}
                />
                <span className="truncate">{no}</span>
              </label>
            )}
          </VirtualCommandList>
        )}
      </div>
    </Command>
  );

  // ใน submenu ของ ListFilterMenu — โชว์รายการตรง ๆ ไม่ต้องมีปุ่ม trigger ซ้อน
  if (inline) {
    return list;
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
      modal
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("justify-between", className)}
        >
          <span
            className={cn(
              "truncate",
              !selectedCount && "text-muted-foreground text-xs",
            )}
          >
            {valueText}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        {list}
      </PopoverContent>
    </Popover>
  );
}
```
`grn-component.tsx`: แทนคอมเมนต์เหนือ field `invoice_no` ด้วย:
```ts
        // ตัวเลือกมาจากใบรับของ (distinct invoice_no) — GrnInvoiceFilter ยิงตอนเปิด
        // popover ทีละหน้าเท่านั้น (ส่วน chip ไม่ต้องรอ fetch: ค่าที่เก็บคือเลขที่จริง
        // ไม่ใช่ id chipValueText จึงอ่านออกเองอยู่แล้ว)
```

- [ ] **Step 6: static checks + เทสต์เดิม + ตรวจมือ**

Run: `bun run typecheck && bun run lint`
Expected: 0 error
Run: `bun test:run routes/system-admin routes/store-operation routes/procurement/goods-receive-note`
Expected: PASS
Run: `grep -rn "useAllUsers\|perpage: -1" routes/system-admin/activity-log routes/system-admin/user-activity routes/system-admin/user/user-component.tsx routes/store-operation/store-requisition routes/procurement/goods-receive-note/grn-invoice-filter.tsx`
Expected: ไม่พบ

ตรวจมือ:
1. `/system-admin/activity-log`: เลือกผู้ใช้ 2 คนในตัวกรอง → URL `actor_id=<uid1>,<uid2>` (ไม่มี `|string:`) · request ของ log มี query `actor_id=<uid1>,<uid2>` · chip ขึ้นชื่อ · เปิด URL เดิมในแท็บใหม่ → chip ขึ้นชื่อโดยไม่ต้องเปิด popover
2. `/system-admin/user`: ตัวกรองแผนกเลือกได้หลายค่า รายการแสดง `code - name`
3. SR list: ตัวกรองคลังต้นทางไม่มีคลังชนิด direct · ปลายทางมีครบ
4. GRN list: ตัวกรองเลขที่ใบแจ้งหนี้ → เลื่อนลงแล้วโหลด `page=2&sort=invoice_no:asc` · พิมพ์ `0617` → ค้นที่ server · ค่าเดิมใน URL (`invoice_no|string:0617002`) ยังติ๊กอยู่

- [ ] **Step 7: Commit**

```bash
git add routes/system-admin/user/user-component.tsx routes/store-operation/store-requisition/sr-component.tsx routes/system-admin/activity-log/activity-log-component.tsx routes/system-admin/user-activity/user-activity-component.tsx routes/procurement/goods-receive-note/grn-invoice-filter.tsx routes/procurement/goods-receive-note/grn-component.tsx
git commit -m "feat(list-filter): ตัวกรองแผนกผู้ใช้ คลัง SR ผู้ใช้ใน log และเลขที่ใบแจ้งหนี้ GRN โหลดทีละหน้า เลิกดึงทะเบียนทั้งก้อน"
```
(`git rm` ใน Step 1–2 stage การลบไว้แล้ว)

---
### Task 6: id→ชื่อ — หน่วย (spot check, unit conversion) · eco label / certificate · หมวดแม่ของสูตร

**Files (Modify):**
- `routes/inventory-management/spot-check/sc-entry-component.tsx` (import L23, L73-78)
- `routes/inventory-management/spot-check/sc-review-component.tsx` (import L7, L36-40)
- `routes/product-management/product/pd-tab-unit-conversion.tsx` (import L33, L83-123)
- `routes/product-management/product/pd-tab-eco.tsx` (L22, L48-51, cell `eco_label`, deps)
- `routes/vendor-management/vendor/vendor-certificate-section.tsx` (L21, L51-54, cell `certificate`, deps)
- `routes/operation-plan/category/recipe-category-form.tsx` (L9-14, L38-41, L60-67, L125-131)
- `routes/operation-plan/category/recipe-category-general-fields.tsx` (props + `LookupRecipeCategory`)

**Interfaces:**
- Consumes: `useEntitiesByIds<T>` (คืน `items` เป็น reference นิ่งจาก react-query หรือ `EMPTY` ตัวเดียว — ใช้เป็น dep ของ `useMemo` ได้) · `LookupRecipeCategory.onItemChange` (Task 2 Step 6)
- Produces: `RecipeCategoryGeneralFields` prop `onParentChange: (parent?: RecipeCategory) => void` (เดิม `(parentId: string) => void`) และ**ลบ** prop `getCategoryName`

กติกา: เก็บ id ที่หน้านั้นอ้างถึง (unique) → `useEntitiesByIds` → `Map` · ไม่มี id = ไม่ยิง · ระหว่างโหลดแสดงค่าว่าง ห้ามแสดง id ดิบ

- [ ] **Step 1: `sc-entry-component.tsx`**

imports: เพิ่ม `import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";` + `import type { Unit } from "@/types/unit";` (คง `useUnit`)
ลบบล็อก L73-78:
```ts
  // โหลด units ทั้งหมดเพื่อ resolve inventory_unit_id → name
  const { data: unitsData } = useUnit({ perpage: -1 });
  const unitNameById = new Map<string, string>();
  for (const u of unitsData?.data ?? []) {
    unitNameById.set(u.id, u.name);
  }
```
แล้ววางต่อจากบรรทัด `const details = spotCheck?.tb_spot_check_detail ?? [];`:
```ts
  // ชื่อหน่วยเฉพาะที่แถวในใบนี้อ้างถึง (ดึงตาม id) — ไม่ลากทะเบียนหน่วยทั้ง BU
  const { items: units } = useEntitiesByIds<Unit>({
    useListHook: useUnit,
    ids: details.map((d) => d.inventory_unit_id),
  });
  const unitNameById = new Map(units.map((u) => [u.id, u.name]));
```
(ผู้ใช้ `unitNameById.get(…) ?? ""` ที่ export และแถวรายการใช้ต่อได้ — ระหว่างโหลดได้ `""`)

- [ ] **Step 2: `sc-review-component.tsx`**

imports: เพิ่ม `useEntitiesByIds` + `import type { Unit } from "@/types/unit";`
แทน:
```ts
  const { data: unitsData } = useUnit({ perpage: -1 });
  const unitNameById = new Map<string, string>();
  for (const u of unitsData?.data ?? []) {
    unitNameById.set(u.id, u.name);
  }
```
ด้วย:
```ts
  // ชื่อหน่วยเฉพาะที่แถว review อ้างถึง (ดึงตาม id)
  const { items: units } = useEntitiesByIds<Unit>({
    useListHook: useUnit,
    ids: review.items.map((it) => it.inventory_unit_id),
  });
  const unitNameById = new Map(units.map((u) => [u.id, u.name]));
```

- [ ] **Step 3: `pd-tab-unit-conversion.tsx`** (Map เป็น dep ของ `columns` — ต้อง memo บน `items` ที่ reference นิ่ง)

imports: เพิ่ม `import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";` + `import type { Unit } from "@/types/unit";`
แทนบล็อกตั้งแต่ `/* ---- Resolve unit names ---- */` ถึงจบ `const usedSelectableIds = useMemo(…);` (L83-123) ด้วย:
```ts
  /* ---- Collect unit IDs referenced by this table ---- */
  // Stable string-key so `usedSelectableIds` / `unitIds` keep their reference
  // when only qty/desc fields change. Keeps `columns` reference stable so cells
  // aren't remounted and inputs keep their focus.
  const watchedUnits = useWatch({ control: form.control, name });
  const usedIdsKey = (watchedUnits ?? [])
    .map((u) => (isOrder ? u.from_unit_id : u.to_unit_id) ?? "")
    .join("|");
  const usedSelectableIds = useMemo(
    () => (usedIdsKey ? usedIdsKey.split("|").filter(Boolean) : []),
    [usedIdsKey],
  );

  /* ---- Resolve unit names ---- */
  // ดึงเฉพาะหน่วยที่ตารางนี้อ้างถึง (หน่วยนับ + from/to ทุกแถว) ไม่ลากทะเบียนทั้ง BU
  // — เลือกหน่วยใหม่ในแถวเมื่อไร key เปลี่ยนแล้วยิงใหม่หนึ่งรอบ (ระหว่างนั้นชื่อว่าง)
  const unitIdsKey = [
    ...new Set(
      [
        inventoryUnitId ?? "",
        ...(watchedUnits ?? []).flatMap((u) => [
          u.from_unit_id ?? "",
          u.to_unit_id ?? "",
        ]),
      ].filter(Boolean),
    ),
  ]
    .sort()
    .join("|");
  const unitIds = useMemo(
    () => (unitIdsKey ? unitIdsKey.split("|") : []),
    [unitIdsKey],
  );
  const { items: units } = useEntitiesByIds<Unit>({
    useListHook: useUnit,
    ids: unitIds,
  });
  // `units` เป็น reference นิ่ง (react-query / EMPTY) — Map ต้อง memo บนมัน ไม่งั้น
  // `columns` สร้างใหม่ทุก render แล้วตาราง editable วน render (memory
  // editable-datagrid-must-memoize-columns)
  const unitMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of units) {
      m.set(u.id, u.name);
    }
    return m;
  }, [units]);

  // ทศนิยมที่หน่วยนั้นกรอกได้ — กติกาเดียวกับช่อง qty ของ PR/PO/GRN ที่อ่าน
  // `decimal_place` จาก master data (EA = 0, kg ให้เศษ) ต่างกันแค่ที่นั่นดึงหน่วย
  // ของสินค้ารายตัว ส่วนที่นี่หน่วยยังไม่ผูกกับสินค้าเลยอ่านจากทะเบียนหน่วยตรง ๆ
  const unitDecimalsMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of units) {
      const dp = u.decimal_place;
      m.set(
        u.id,
        dp == null || !Number.isFinite(dp)
          ? DEFAULT_QTY_DECIMALS
          : Math.min(Math.max(Math.trunc(dp), 0), QTY_MAX_DECIMALS),
      );
    }
    return m;
  }, [units]);

  const inventoryUnitName = unitMap.get(inventoryUnitId) ?? "";
```
(ตรวจว่า `Unit` มี `decimal_place` — ถ้า tsc แดงที่ `u.decimal_place` ให้ดู `types/unit.ts` ว่าเป็น optional หรือชื่ออื่น แล้วใช้ตามนั้น; โค้ดเดิมอ่าน `u.decimal_place` จาก type เดียวกันผ่าน `useUnit` จึงควรผ่าน)

- [ ] **Step 4: `pd-tab-eco.tsx`**

imports: เพิ่ม `import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";` + `import type { EcoLabel } from "@/types/eco-label";`
แทน:
```ts
  const { data: masterData } = useEcoLabel({ perpage: -1 });
  const masterMap = new Map(
    (masterData?.data ?? []).map((c) => [c.id, c] as const),
  );
```
ด้วย:
```ts
  // master เฉพาะที่แถวของสินค้านี้อ้างถึง (ดึงตาม id) · memo บน `items` / `masters`
  // ที่ reference นิ่ง — masterMap เป็น dep ของ columns ถ้าสร้างใหม่ทุก render
  // ตารางจะวน render (memory editable-datagrid-must-memoize-columns)
  const masterIds = useMemo(
    () => items.map((i) => i.master_eco_label_id),
    [items],
  );
  const { items: masters } = useEntitiesByIds<EcoLabel>({
    useListHook: useEcoLabel,
    ids: masterIds,
  });
  const masterMap = useMemo(
    () => new Map(masters.map((c) => [c.id, c] as const)),
    [masters],
  );
```
cell `eco_label`: แทน
```tsx
            {masterMap.get(row.original.master_eco_label_id)?.name ??
              row.original.master_eco_label_id}
```
ด้วย `{masterMap.get(row.original.master_eco_label_id)?.name ?? ""}`
deps ของ `columns`:
```ts
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handler ของแถว (handleEdit/setDeleteItem) สร้างใหม่ทุก render
    [readOnly, dateFormat, tfl, tc, ts, masterMap],
```

- [ ] **Step 5: `vendor-certificate-section.tsx`**

imports: เพิ่ม `useEntitiesByIds` + `import type { Certification } from "@/types/certification";`
แทน:
```ts
  const { data: masterData } = useCertification({ perpage: -1 });
  const masterMap = new Map(
    (masterData?.data ?? []).map((c) => [c.id, c] as const),
  );
```
ด้วย:
```ts
  // master เฉพาะที่แถวของ vendor นี้อ้างถึง (ดึงตาม id) · memo บน `items` /
  // `masters` ที่ reference นิ่ง — masterMap เป็น dep ของ columns ถ้าสร้างใหม่ทุก
  // render section นี้จะวน render แบบเดียวกับบั๊ก 245,156 รอบข้างบน
  const masterIds = useMemo(
    () => items.map((i) => i.master_certificate_id),
    [items],
  );
  const { items: masters } = useEntitiesByIds<Certification>({
    useListHook: useCertification,
    ids: masterIds,
  });
  const masterMap = useMemo(
    () => new Map(masters.map((c) => [c.id, c] as const)),
    [masters],
  );
```
cell `certificate`: `?? row.original.master_certificate_id}` → `?? ""}`
deps ของ `columns`:
```ts
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handler ของแถวสร้างใหม่ทุก render
    [readOnly, dateFormat, tfl, tc, masterMap],
```

- [ ] **Step 6: เทสต์ render loop เดิม (Review Focus ข้อ 4)**

Run: `bun test:run routes/vendor-management/vendor/vendor-certificate-loop.test.tsx routes/vendor-management/vendor/vendor-form.characterization.test.tsx routes/product-management`
Expected: PASS (mock `useCertification: () => ({ data: undefined })` ยังเข้ากับ `useEntitiesByIds` — ถ้าแดงที่จำนวน render ให้ตรวจว่า `masterIds`/`masterMap` memo ครบ อย่าแก้ threshold ของเทสต์)

- [ ] **Step 7: `recipe-category-form.tsx` + `recipe-category-general-fields.tsx`** (level ของหมวดใหม่ = level ของหมวดแม่ + 1 — ได้ object หมวดแม่จาก `onItemChange` ตอนเลือก แทนการค้นใน map ทั้ง BU)

`recipe-category-form.tsx`:
- import L9-14: ลบ `useRecipeCategory,` ออกจากรายการ
- ลบ:
```ts
  const { data: allCategoryData } = useRecipeCategory({ perpage: -1 });
  const categoryMap = new Map(
    (allCategoryData?.data ?? []).map((c) => [c.id, c]),
  );
```
- แทน `handleParentChange` ทั้งก้อนด้วย:
```ts
  const handleParentChange = (parent?: RecipeCategory) => {
    form.setValue("level", parent ? parent.level + 1 : 1);
  };
```
- `<RecipeCategoryGeneralFields …>`: ลบบรรทัด `getCategoryName={(id) => categoryMap.get(id)?.name}`

`recipe-category-general-fields.tsx`:
- เพิ่ม `import type { RecipeCategory } from "@/types/recipe-category";`
- interface: แทน `readonly onParentChange: (parentId: string) => void;` + JSDoc/prop `getCategoryName` ทั้งก้อน ด้วย:
```ts
  /** หมวดแม่ที่ผู้ใช้เพิ่งเลือก (undefined = ล้างค่า) — ใช้คำนวณ level */
  readonly onParentChange: (parent?: RecipeCategory) => void;
```
- destructure: ลบ `getCategoryName,`
- แทน `<LookupRecipeCategory …/>` ด้วย:
```tsx
              <LookupRecipeCategory
                value={field.value ?? ""}
                onValueChange={(id) => {
                  field.onChange(id || null);
                  if (!id) onParentChange(undefined);
                }}
                onItemChange={(parent) => onParentChange(parent)}
                disabled={isDisabled}
                placeholder={t("notSet")}
                excludeIds={excludeIds}
                error={errors.parent_id?.message}
              />
```
(ชื่อหมวดแม่ที่บันทึกไว้ขึ้นผ่าน `selectedIds` ของ lookup — Task 2 Step 6 — จึงไม่ต้องมี `defaultLabel`)

- [ ] **Step 8: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error
Run: `bun test:run routes/inventory-management/spot-check routes/product-management routes/vendor-management/vendor routes/operation-plan/category`
Expected: PASS

- [ ] **Step 9: ตรวจมือ**
1. spot-check: เปิดใบที่กำลังนับ → ชื่อหน่วยขึ้นครบทุกแถว · Network มี `units?…filter=id|string:…` ไม่มี `perpage=-1`
2. product แก้ไข → แท็บ unit conversion: ชื่อหน่วยขึ้น เลือกหน่วยใหม่ในแถว → ชื่อว่างชั่วครู่แล้วกลับมา · พิมพ์ qty แล้ว focus ไม่หลุด
3. vendor แก้ไข → กด Save (ถาม user ก่อน — เขียน DB) หรือเปิด vendor ที่มี certificate แล้วสลับ Edit/Cancel หลายครั้ง → แท็บ certificate ไม่ค้าง (React DevTools Profiler ไม่วน)
4. recipe category ใหม่ → เลือกหมวดแม่ level 1 → field level เป็น 2 · เปิดหมวดที่มีแม่อยู่หลังหน้าแรก → ช่องแม่ขึ้นชื่อทันที

- [ ] **Step 10: Commit**

```bash
git add routes/inventory-management/spot-check routes/product-management/product/pd-tab-unit-conversion.tsx routes/product-management/product/pd-tab-eco.tsx routes/vendor-management/vendor/vendor-certificate-section.tsx routes/operation-plan/category
git commit -m "refactor(lookup): ชื่อหน่วย eco label certificate และหมวดแม่ของสูตรดึงเฉพาะ id ที่อยู่บนหน้า เลิกลากทะเบียนทั้งก้อน"
```

---

### Task 7: id→ชื่อ / ค่า default ฝั่ง procurement (สกุลเงิน · คลัง)

**Files (Modify):**
- `routes/procurement/credit-note/cn-footer-action.tsx` (L6, L26-30)
- `routes/procurement/goods-receive-note/grn-summary-footer.tsx` (L6, L39-42)
- `routes/procurement/purchase-order/po-general-fields.tsx` (L9, L44, L51-61)
- `routes/procurement/purchase-order/from-price-list/step-select-items.tsx` (L34, L180-185, `canSelectRow`, `handleRowSelectionChange`)
- `routes/procurement/purchase-order/from-price-list/step-summary.tsx` (L18, L95-105, cell location)
- `routes/procurement/purchase-request/pr-item-cells/location-cell.tsx` (L19, L51-59)

**Interfaces:**
- Consumes: `useEntitiesByIds<T>({ useListHook, ids, idFilterKey?, enabled? })`
- Produces: ไม่มี

- [ ] **Step 1: `cn-footer-action.tsx`**

imports: เพิ่ม `import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";` + `import type { Currency } from "@/types/currency";`
แทน:
```ts
  const { data: currencyData } = useCurrency({ perpage: -1 });
  const currencyCode =
    currencyData?.data?.find((c) => c.id === currencyId)?.code ?? "";
```
ด้วย:
```ts
  const { items: currencies } = useEntitiesByIds<Currency>({
    useListHook: useCurrency,
    ids: currencyId ? [currencyId] : [],
  });
  const currencyCode = currencies.find((c) => c.id === currencyId)?.code ?? "";
```

- [ ] **Step 2: `grn-summary-footer.tsx`** (ค่าสำรอง `currency_name` ตามเดิม · สกุลที่ถูกปิดไปแล้วก็หาเจอ — เดิมกรอง active ทิ้ง)

imports: เหมือน Step 1
แทน:
```ts
  const { data: currencyData } = useCurrency({ perpage: -1 });
  const currencies = currencyData?.data?.filter((c) => c.is_active) ?? [];
  const currencyCode =
    currencies.find((c) => c.id === currencyId)?.code || currencyName;
```
ด้วย:
```ts
  const { items: currencies } = useEntitiesByIds<Currency>({
    useListHook: useCurrency,
    ids: currencyId ? [currencyId] : [],
  });
  const currencyCode =
    currencies.find((c) => c.id === currencyId)?.code || currencyName;
```

- [ ] **Step 3: `po-general-fields.tsx`** (ตั้งสกุลตั้งต้น + rate)

imports: เพิ่ม `useEntitiesByIds` + `import type { Currency } from "@/types/currency";`
แทน `const { data: currencyData } = useCurrency({ perpage: -1 });` ด้วย:
```ts
  // ดึงเฉพาะสกุลตั้งต้นของ BU ตอนที่ฟอร์มยังไม่มีสกุล (ใบใหม่) — ใช้ตั้ง code + rate
  const { items: defaultCurrencies } = useEntitiesByIds<Currency>({
    useListHook: useCurrency,
    ids: !currencyId && defaultCurrencyId ? [defaultCurrencyId] : [],
  });
```
แทน `useEffect` ทั้งก้อนด้วย:
```ts
  useEffect(() => {
    if (currencyId || !defaultCurrencyId) return;
    const currency = defaultCurrencies.find(
      (c) => c.id === defaultCurrencyId && c.is_active,
    );
    if (currency) {
      form.setValue("currency_id", defaultCurrencyId);
      form.setValue("currency_code", currency.code);
      form.setValue("exchange_rate", currency.exchange_rate);
    }
  }, [currencyId, defaultCurrencyId, defaultCurrencies, form]);
```
(`defaultCurrencies` คือ `items` ของ `useEntitiesByIds` — reference นิ่ง effect จึงไม่วน)

- [ ] **Step 4: `step-select-items.tsx`** (Review Focus ข้อ 3 — ห้ามติ๊กแถวสกุลที่ยังไม่มีเรต)

imports: เพิ่ม `useEntitiesByIds` + `import type { Currency } from "@/types/currency";`
แทนคอมเมนต์ + บล็อก:
```ts
  // เรตของสกุลเงินของ price list — ถ้าไม่ดึงมาเทียบ ใบสกุลต่างประเทศจะถูกส่งด้วย
  // exchange_rate 1 ของ EMPTY_FORM · perpage: -1 (key เดียวกับ LookupCurrency)
  // เดิม 30 สกุลที่อยู่หลังหน้าแรกหาเรตไม่เจอแล้วเงียบ ๆ ได้ 1
  const { data: currencyData } = useCurrency({ perpage: -1 });
  const currencies = currencyData?.data ?? [];
```
ด้วย:
```ts
  // เรตของสกุลเงินของ price list ที่อยู่ในตาราง (ดึงตาม id) — ถ้าไม่มีเรต ใบสกุล
  // ต่างประเทศจะถูกส่งด้วย exchange_rate 1 ของ EMPTY_FORM เงียบ ๆ (บั๊กเดิม) จึงถือว่า
  // แถวที่เรตของสกุลยังไม่มา "ยังไม่พร้อม" — ติ๊กไม่ได้จนกว่าเรตจะมาถึง
  const currencyIds = useMemo(
    () => allRows.map((r) => r.currency?.id ?? ""),
    [allRows],
  );
  const { items: rateCurrencies } = useEntitiesByIds<Currency>({
    useListHook: useCurrency,
    ids: currencyIds,
  });
  const rateById = useMemo(
    () => new Map(rateCurrencies.map((c) => [c.id, c.exchange_rate] as const)),
    [rateCurrencies],
  );
  const isRateReady = useCallback(
    (row: PlRow) => !row.currency?.id || rateById.get(row.currency.id) != null,
    [rateById],
  );
```
แทน `canSelectRow`:
```ts
  const canSelectRow = useCallback(
    (row: PlRow) =>
      row.canUse &&
      isRateReady(row) &&
      (activeCurrency == null || row.currency?.id === activeCurrency.id),
    [activeCurrency, isRateReady],
  );
```
ใน `handleRowSelectionChange` แทน:
```ts
    const added = allRows.filter(
      (r) => wanted.has(r.detail.id) && !keptIds.has(r.detail.id) && r.canUse,
    );
```
ด้วย:
```ts
    const added = allRows.filter(
      (r) =>
        wanted.has(r.detail.id) &&
        !keptIds.has(r.detail.id) &&
        r.canUse &&
        isRateReady(r),
    );
```
และแทน:
```ts
      const rate = currencies.find((c) => c.id === currency.id)?.exchange_rate;
```
ด้วย:
```ts
      const rate = rateById.get(currency.id);
```
(`columns` ใช้ `canSelectRow` ใน deps อยู่แล้ว — ไม่ต้องเพิ่ม `rateById` ซ้ำ)

- [ ] **Step 5: `step-summary.tsx`**

imports: เพิ่ม `import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";` + `import type { Location } from "@/types/location";` (คง `useLocation`)
แทน:
```ts
  const { data: locationsRes, isLoading: locLoading } = useLocation({
    perpage: -1,
  });

  const locationMap = (() => {
    const m = new Map<string, string>();
    const list = Array.isArray(locationsRes) ? [] : (locationsRes?.data ?? []);
    for (const loc of list) m.set(loc.id, loc.name);
    return m;
  })();
```
ด้วย:
```ts
  // ชื่อคลังเฉพาะที่ item ในใบนี้เลือก (ดึงตาม id)
  const { items: locations, isLoading: locLoading } =
    useEntitiesByIds<Location>({
      useListHook: useLocation,
      ids: items.map((i) => i.location_id ?? ""),
    });
  const locationMap = new Map(locations.map((l) => [l.id, l.name]));
```
แทน:
```ts
                    const locationName = locationId
                      ? (locationMap.get(locationId) ?? locationId)
                      : "—";
```
ด้วย (ค่าสำรองคือชื่อที่ step เลือกคลังเขียนไว้ใน item — ไม่แสดง id ดิบ):
```ts
                    const locationName = locationId
                      ? (locationMap.get(locationId) ??
                        (item.location_name || "—"))
                      : "—";
```

- [ ] **Step 6: `location-cell.tsx`**

imports: เพิ่ม `import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";` + `import type { Location } from "@/types/location";` (คง `useUserLocation`)
แทน:
```ts
  // Resolve location_type from cached user locations when API doesn't provide it
  const { data: locationsData } = useUserLocation({ perpage: -1 });

  const locationType = (() => {
    if (storedType) return storedType;
    if (!locationId || !locationsData?.data) return "";
    const found = locationsData.data.find((l) => l.id === locationId);
    return found?.location_type ?? "";
  })();
```
ด้วย:
```ts
  // location_type ของคลังเมื่อ API ไม่ส่งมา — ดึงเฉพาะคลังของแถวนี้ (แถวที่ id ซ้ำ
  // ใช้ cache ร่วมกัน) และไม่ยิงเลยเมื่อแถวมี type อยู่แล้ว
  const { items: locationItems } = useEntitiesByIds<Location>({
    useListHook: useUserLocation,
    ids: locationId ? [locationId] : [],
    enabled: !storedType,
  });
  const locationType =
    storedType ||
    (locationItems.find((l) => l.id === locationId)?.location_type ?? "");
```

- [ ] **Step 7: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error — ถ้า `item.location_name` ไม่มีใน `FromPriceListSelectedItem` ให้ดู `from-price-list-form-schema.ts` (step-select-items เขียน `location_name` ผ่าน `patchItem` อยู่แล้ว L423) แล้วใช้ชื่อฟิลด์ตามนั้น
Run: `bun test:run routes/procurement`
Expected: PASS
Run: `grep -rn "perpage: -1" routes/procurement`
Expected: ไม่พบ

- [ ] **Step 8: ตรวจมือ**
1. PO ใหม่ (manual): ช่องสกุลเงินตั้งเป็นสกุลตั้งต้นของ BU พร้อม rate (Network: `currencies?…filter=id|string:<default>` perpage=1)
2. PO จาก price list: เลือก vendor ที่มี price list สกุล USD → ใน DevTools ตั้ง throttling "Slow 3G" แล้วเข้าขั้นเลือกรายการ → ระหว่างเรตยังไม่มา แถว USD จาง ติ๊กไม่ได้ · เรตมาแล้วติ๊กได้ → ขั้นสรุปแสดง exchange rate ≠ 1 (ห้ามกดสร้างใบถ้าไม่ได้ถาม user)
3. ขั้นสรุป: คอลัมน์คลังขึ้นชื่อ ไม่มี id ดิบ
4. CN / GRN แก้ไข: ยอดรวมท้ายฟอร์มต่อท้ายด้วยรหัสสกุล (`THB`)
5. PR แก้ไข: ป้ายชนิดคลังของแถวขึ้น (แถวที่ API ไม่ส่ง `location_type`)

- [ ] **Step 9: Commit**

```bash
git add routes/procurement
git commit -m "refactor(procurement): สกุลเงินและคลังในฟอร์ม CN GRN PO PR ดึงตาม id แทน perpage=-1 และกันติ๊กแถวสกุลต่างประเทศก่อนเรตมาถึง"
```

---

### Task 8: dropdown ในฟอร์ม — adjustment type / eco label / certificate เป็น combobox แบบ lazy

**Files:**
- Create: `routes/inventory-management/inventory-adjustment/lookup-adjustment-type.tsx`
- Create: `routes/product-management/product/lookup-eco-label.tsx`
- Create: `routes/vendor-management/vendor/lookup-certification.tsx`
- Modify: `routes/inventory-management/inventory-adjustment/ia-form.tsx` (L15, L91-101, `<DocumentInfo …>`)
- Modify: `routes/inventory-management/inventory-adjustment/ia-doc-info.tsx` (imports, props, Controller `adjustment_type_id`, `PlainReasonValue`)
- Modify: `routes/product-management/product/pd-eco-label-dialog.tsx` (imports, L95-100, Controller `master_eco_label_id`)
- Modify: `routes/vendor-management/vendor/vendor-certificate-dialog.tsx` (imports, L96-101, Controller `master_certificate_id`)

**Interfaces:**
- Consumes: `useLookupPagination`, `ACTIVE_ONLY_FILTER`, `LookupCombobox` (`selectedItems`, `allowDeselect`, `modal`), `useEntitiesByIds`
- Produces:
  - `LookupAdjustmentType({ value, onValueChange, kind: ADJUSTMENT_TYPE, disabled?, placeholder?, className?, error? })`
  - `LookupEcoLabel({ value, onValueChange, onItemChange?: (label: EcoLabel) => void, disabled?, placeholder?, className?, error?, modal? })`
  - `LookupCertification({ value, onValueChange, onItemChange?: (cert: Certification) => void, disabled?, placeholder?, className?, error?, modal? })`
  - `DocumentInfo` prop `adjustmentKind: ADJUSTMENT_TYPE` แทน `adjTypes`

ทั้งสามตัวเดิมเป็น `<Select>` → `allowDeselect={false}` (บทเรียน PR #197: คลิกตัวที่เลือกซ้ำต้องไม่ล้างค่า) · ค่าที่บันทึกไว้แม้ master ถูกปิดใช้งานยังขึ้นชื่อผ่าน `selectedItems` (แทน `at.id === savedAdjTypeId` / `c.id === ecoLabel?.master_eco_label_id` เดิม) · สองตัวใน Dialog ส่ง `modal` ให้ popover เลื่อนด้วยล้อเมาส์ได้ในกล่อง

- [ ] **Step 1: สร้าง `lookup-adjustment-type.tsx`**

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { LookupCombobox } from "@/components/lookup/lookup-combobox";
import { useAdjustmentType } from "@/hooks/use-adjustment-type";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type {
  ADJUSTMENT_TYPE,
  AdjustmentType,
} from "@/types/adjustment-type";

interface LookupAdjustmentTypeProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** ชนิดของเอกสาร — รายการมีเฉพาะเหตุผลของชนิดนี้ (กรองที่ server) */
  readonly kind: ADJUSTMENT_TYPE;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
}

/**
 * เหตุผลการปรับปรุงสต็อก (adjustment type) ของใบ IA — ค้นที่ server โหลดทีละหน้า
 * ค่าที่ใบบันทึกไว้แม้ถูกปิดใช้งานแล้วยังขึ้นชื่อ (ดึงตาม id แยก ไม่ผ่าน filter active)
 */
export function LookupAdjustmentType({
  value,
  onValueChange,
  kind,
  disabled,
  placeholder,
  className,
  error,
}: LookupAdjustmentTypeProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<AdjustmentType>({
      useListHook: useAdjustmentType,
      search,
      serverFilter: `${ACTIVE_ONLY_FILTER},type|string:${kind}`,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      allowDeselect={false}
      value={value}
      onValueChange={(id) => onValueChange(id)}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(at) => at.id}
      getLabel={(at) => at.name}
      getSearchValue={(at) => `${at.code} ${at.name}`}
      placeholder={placeholder ?? tfl("selectAdjustmentType")}
      searchPlaceholder={tl("search", { entity: tfl("adjustmentType") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={error}
    />
  );
}
```

- [ ] **Step 2: `ia-form.tsx`**

ลบ import `import { useAdjustmentType } from "@/hooks/use-adjustment-type";`
แทนบล็อก:
```ts
  const { data: adjTypeData } = useAdjustmentType({ perpage: -1 });
  // เหตุผลที่ใบบันทึกไว้คงไว้แม้ถูกปิดใช้งานแล้ว ไม่งั้น Select ตอนแก้ไขขึ้นว่าง
  const savedAdjTypeId =
    inventoryAdjustment?.adjustment_type?.id ??
    inventoryAdjustment?.adjustment_type_id;
  const adjTypes =
    adjTypeData?.data?.filter(
      (at) =>
        (at.is_active || at.id === savedAdjTypeId) &&
        at.type === adjTypeFilter,
    ) ?? [];
```
ด้วย: (ไม่มีอะไร — ลบทิ้ง; `adjTypeFilter` ข้างบนคงไว้)
ใน `<DocumentInfo …>` แทน `adjTypes={adjTypes}` ด้วย `adjustmentKind={adjTypeFilter}`

- [ ] **Step 3: `ia-doc-info.tsx`**

imports: ลบ `FieldSelect,` ออกจาก import ของ `@/components/ui/field` · ลบ `import { SelectContent, SelectItem } from "@/components/ui/select";` · เพิ่ม
```ts
import { useAdjustmentType } from "@/hooks/use-adjustment-type";
import { useEntitiesByIds } from "@/hooks/use-entities-by-ids";
import type {
  ADJUSTMENT_TYPE,
  AdjustmentType,
} from "@/types/adjustment-type";
import { LookupAdjustmentType } from "./lookup-adjustment-type";
```
interface `DocumentInfoProps`: แทน `readonly adjTypes: ReadonlyArray<{ id: string; name: string }>;` ด้วย `readonly adjustmentKind: ADJUSTMENT_TYPE;` · destructure `adjTypes,` → `adjustmentKind,`
view mode: แทน
```tsx
          <PlainReasonValue
            control={form.control}
            adjTypes={adjTypes}
            fallback={
```
ด้วย
```tsx
          <PlainReasonValue
            control={form.control}
            fallback={
```
edit mode: แทน `<FieldSelect …>…</FieldSelect>` ใน Controller `adjustment_type_id` ด้วย:
```tsx
              <LookupAdjustmentType
                value={field.value ?? ""}
                onValueChange={field.onChange}
                kind={adjustmentKind}
                disabled={isDisabled}
                className="w-full text-xs"
                error={form.formState.errors.adjustment_type_id?.message}
              />
```
แทน `function PlainReasonValue` ทั้งก้อนด้วย:
```tsx
function PlainReasonValue({
  control,
  fallback,
}: {
  readonly control: Control<AdjFormValues>;
  readonly fallback?: string;
}) {
  const adjustmentTypeId = useWatch({ control, name: "adjustment_type_id" });
  // endpoint รายละเอียดมีแค่ id+code ของเหตุผล — ดึงชื่อตาม id (fallback ระหว่างโหลด)
  const { items } = useEntitiesByIds<AdjustmentType>({
    useListHook: useAdjustmentType,
    ids: adjustmentTypeId ? [adjustmentTypeId] : [],
  });
  const name = items.find((at) => at.id === adjustmentTypeId)?.name;
  return <FieldPlainText>{name ?? fallback}</FieldPlainText>;
}
```

- [ ] **Step 4: สร้าง `routes/product-management/product/lookup-eco-label.tsx`**

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { LookupCombobox } from "@/components/lookup/lookup-combobox";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { EcoLabel } from "@/types/eco-label";
import { useEcoLabel } from "../shared/use-eco-label";

interface LookupEcoLabelProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (label: EcoLabel) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
  /** อยู่ใน Dialog — ให้ popover เลื่อนด้วยล้อเมาส์ได้ */
  readonly modal?: boolean;
}

/**
 * master eco label — ค้นที่ server โหลดทีละหน้า · label ที่ผูกไว้แม้ master ถูกปิด
 * ใช้งานแล้วยังขึ้นชื่อ (ดึงตาม id) ไม่งั้นช่องว่างแล้วติด required จน Save ไม่ได้
 */
export function LookupEcoLabel({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  error,
  modal,
}: LookupEcoLabelProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<EcoLabel>({
      useListHook: useEcoLabel,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      allowDeselect={false}
      modal={modal}
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(c) => c.id}
      getLabel={(c) => `${c.code} · ${c.name}`}
      placeholder={placeholder ?? tl("select", { entity: tfl("ecoLabel") })}
      searchPlaceholder={tl("search", { entity: tfl("ecoLabel") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={error}
    />
  );
}
```

- [ ] **Step 5: `pd-eco-label-dialog.tsx`**

imports: ลบ `FieldSelect,` จาก import ของ `@/components/ui/field` · ลบ `import { SelectContent, SelectItem } from "@/components/ui/select";` · ลบ `import { useEcoLabel } from "../shared/use-eco-label";` · เพิ่ม `import { LookupEcoLabel } from "./lookup-eco-label";`
ลบ:
```ts
  const { data: masterData } = useEcoLabel({ perpage: -1 });
  // label ที่ผูกไว้คงไว้แม้ master ถูกปิดใช้งานแล้ว ไม่งั้น Select ว่างและติด
  // validation required จน Save ไม่ได้
  const masterLabels = (masterData?.data ?? []).filter(
    (c) => c.is_active || c.id === ecoLabel?.master_eco_label_id,
  );
```
แทน `<FieldSelect …>…</FieldSelect>` ใน Controller `master_eco_label_id` ด้วย:
```tsx
                    <LookupEcoLabel
                      value={field.value}
                      onValueChange={field.onChange}
                      // เติม certificate_no เป็น code ของ master eco label ที่เลือก
                      onItemChange={(master) =>
                        form.setValue("certificate_no", master.code, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      disabled={isPending}
                      placeholder={t("selectEcoLabel")}
                      className="h-8 w-full text-sm"
                      error={form.formState.errors.master_eco_label_id?.message}
                      modal
                    />
```

- [ ] **Step 6: สร้าง `routes/vendor-management/vendor/lookup-certification.tsx`**

```tsx
import { useState } from "react";
import { useTranslations } from "use-intl";
import { LookupCombobox } from "@/components/lookup/lookup-combobox";
import {
  ACTIVE_ONLY_FILTER,
  useLookupPagination,
} from "@/hooks/use-lookup-pagination";
import type { Certification } from "@/types/certification";
import { useCertification } from "../shared/use-certification";

interface LookupCertificationProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (cert: Certification) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
  /** อยู่ใน Dialog — ให้ popover เลื่อนด้วยล้อเมาส์ได้ */
  readonly modal?: boolean;
}

/**
 * master certificate — ค้นที่ server โหลดทีละหน้า · certificate ที่ผูกไว้แม้ master
 * ถูกปิดใช้งานแล้วยังขึ้นชื่อ (ดึงตาม id) ไม่งั้นช่องว่างแล้วติด required จน Save ไม่ได้
 */
export function LookupCertification({
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  error,
  modal,
}: LookupCertificationProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [hasOpened, setHasOpened] = useState(false);

  const { items, selectedItems, isLoading, isLoadingMore, hasMore, loadMore } =
    useLookupPagination<Certification>({
      useListHook: useCertification,
      search,
      serverFilter: ACTIVE_ONLY_FILTER,
      enabled: hasOpened,
      selectedIds: value ? [value] : [],
    });

  return (
    <LookupCombobox
      allowDeselect={false}
      modal={modal}
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      onOpenChange={(open) => {
        if (open) setHasOpened(true);
      }}
      items={items}
      selectedItems={selectedItems}
      getId={(c) => c.id}
      getLabel={(c) => `${c.code} · ${c.name}`}
      placeholder={placeholder ?? tl("select", { entity: tfl("certificate") })}
      searchPlaceholder={tl("search", { entity: tfl("certificate") })}
      disabled={disabled}
      className={className}
      isLoading={isLoading}
      serverSideSearch
      onSearchChange={setSearch}
      onLoadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
      error={error}
    />
  );
}
```

- [ ] **Step 7: `vendor-certificate-dialog.tsx`**

imports: ลบ `FieldSelect,` · ลบ `SelectContent, SelectItem` import · ลบ `import { useCertification } from "../shared/use-certification";` · เพิ่ม `import { LookupCertification } from "./lookup-certification";`
ลบ:
```ts
  const { data: masterData } = useCertification({ perpage: -1 });
  // certificate ที่ผูกไว้คงไว้แม้ master ถูกปิดใช้งานแล้ว ไม่งั้น Select ว่างและติด
  // validation required จน Save ไม่ได้
  const masterCerts = (masterData?.data ?? []).filter(
    (c) => c.is_active || c.id === certificate?.master_certificate_id,
  );
```
แทน `<FieldSelect …>…</FieldSelect>` ใน Controller `master_certificate_id` ด้วย:
```tsx
                    <LookupCertification
                      value={field.value}
                      onValueChange={field.onChange}
                      // เติม certificate_no เป็น code ของ master cert ที่เลือก
                      onItemChange={(master) =>
                        form.setValue("certificate_no", master.code, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      disabled={isPending}
                      placeholder={t("selectCertificate")}
                      className="h-8 w-full text-sm"
                      error={
                        form.formState.errors.master_certificate_id?.message
                      }
                      modal
                    />
```

- [ ] **Step 8: static checks + เทสต์เดิม**

Run: `bun run typecheck && bun run lint`
Expected: 0 error (ถ้า lint เตือน `useEntitiesByIds`/`FieldSelect` ไม่ถูกใช้ ให้ลบ import)
Run: `bun test:run routes/inventory-management/inventory-adjustment routes/product-management/product routes/vendor-management/vendor`
Expected: PASS — เทสต์ที่ mock `vi.mock("./vendor-certificate-dialog", …)` ไม่แตะ lookup ใหม่
Run: `grep -rn "perpage: -1" routes/inventory-management/inventory-adjustment routes/product-management/product routes/vendor-management/vendor`
Expected: ไม่พบ

- [ ] **Step 9: ตรวจมือ**
1. IA ใหม่ชนิด stock-in: dropdown เหตุผลมีเฉพาะชนิด stock_in (Network `filter=is_active|boolean:true,type|string:stock_in`) · stock-out ได้เฉพาะ stock_out · คลิกตัวที่เลือกซ้ำ ค่าไม่หาย
2. เปิด IA เดิมโหมด view → เหตุผลขึ้น**ชื่อ** (ไม่ใช่แค่ code) · โหมดแก้ไข → ช่องขึ้นชื่อทันทีโดยไม่เปิด popover
3. product → แท็บ eco → เพิ่ม: เลือก label → `certificate_no` เติม code · popover เลื่อนด้วยล้อเมาส์ได้ในกล่อง · แก้ไขแถวที่ผูก label ที่ถูกปิดแล้ว → ช่องยังขึ้นชื่อ
4. vendor → certificate: เหมือนข้อ 3

- [ ] **Step 10: Commit**

```bash
git add routes/inventory-management/inventory-adjustment routes/product-management/product routes/vendor-management/vendor
git commit -m "feat(lookup): adjustment type eco label และ certificate ในฟอร์มเป็น combobox แบบ lazy load ค่าที่ปิดใช้งานแล้วยังขึ้นชื่อ"
```

---
### Task 9: gate สุดท้าย + ตรวจ grep ตามเกณฑ์ spec §1.2 + บันทึกการตัดสินใจลง spec

**Files:**
- Modify: `hooks/use-location.ts` (JSDoc `@example` สองจุดที่ยังเขียน `perpage: -1`)
- Modify: `docs/superpowers/specs/2026-09-29-lazy-lookup-phase3a-routes-design.md` (§3.1, §3.5, §4, §6)

**Interfaces:** ไม่มี

- [ ] **Step 1: แก้ตัวอย่างใน `hooks/use-location.ts`** (ไม่ให้ JSDoc สอนรูปที่กำลังเลิกใช้ และให้ grep ของ §1.2 สะอาด)

```ts
// ก่อน
 * const { data } = useLocation({ perpage: -1 });
// หลัง
 * const { data } = useLocation({ search, perpage: 30, filter: "is_active|boolean:true" });
```
```ts
// ก่อน
 * const { data } = useConfigLocation({ perpage: -1 }, { enabled: open });
// หลัง
 * const { data } = useConfigLocation({ perpage: 30, page }, { enabled: open });
```
และแก้ประโยค JSDoc ของ `useConfigLocation` `ใช้กับ filter/lookup ที่ต้องการ list ทั้งหมด` → `ใช้กับ filter/lookup (โหลดทีละหน้า)`

- [ ] **Step 2: gate รวม**

Run: `bun run typecheck && bun run lint && bun test:run`
Expected: typecheck/lint 0 error · เทสต์ผ่านทั้งหมด (backend ไม่เกี่ยว — `bun test:run` ของ repo นี้คือ Vitest ฝั่ง FE)

- [ ] **Step 3: เกณฑ์ spec §1.2**

Run: `grep -rnE "perpage:\s*-1|perpage=-1|useAllUsers|useAllProducts" routes components hooks | sort`
Expected: เหลือ**เฉพาะ**รายการนี้ (3b / 4 ตาม spec §1.1) — มีไฟล์อื่นโผล่ = หลุดงาน 3a:
```
hooks/use-all-products.ts                                   (3b — ลบทั้งไฟล์)
hooks/use-all-users.ts                                      (3b — ลบทั้งไฟล์)
routes/config/department/department-form.characterization.test.tsx   (3b — mock useAllUsers)
routes/config/department/department-form.tsx                (3b)
routes/config/exchange-rate/exchange-rate-component.tsx     (4)
routes/config/location/location-form.characterization.test.tsx        (3b)
routes/config/location/location-form.tsx                    (3b)
routes/inventory-management/spot-check/sc-component.tsx     (4)
routes/product-management/category/category-component.tsx  ×3 (4)
routes/report/schedules/schedule-recipients-field.tsx       ×2 (3b)
routes/system-admin/default-setting/use-report-form-templates.ts ×2 (4)
routes/system-admin/inventory-period/inventory-period-component.tsx (4)
routes/system-admin/role/permission-catalog.ts              (4 — คอมเมนต์ GET /permissions?perpage=-1)
routes/system-admin/role/permission-picker.tsx              (4)
routes/system-admin/role/use-role-print.ts                  (4)
routes/system-admin/user/user-assigned-form.tsx             ×2 (3b)
routes/system-admin/user/user-assigned-locations.tsx        (3b)
routes/system-admin/workflow/wf-edit-content.tsx            ×3 (3b)
routes/system-admin/workflow/wf-routing.tsx                 ×2 (3b)
routes/vendor-management/price-list-template/plt-form.characterization.test.tsx (3b)
routes/vendor-management/price-list-template/plt-item-fields.tsx ×2 (3b)
```

Run: `grep -L "selectedIds" components/lookup/lookup-{cuisine,delivery-point,grn-by-vendor-for-cn,physical-count-period,location,product-in-location,product,unit,recipe-category,vendor,equipment-category,location-pair-product,product-location,prt,user-location}.tsx`
Expected: ไม่พบไฟล์ใด (ทั้ง 15 ส่ง `selectedIds`) — `lookup-dataset.tsx` เป็นข้อยกเว้นที่บันทึกไว้

Run: `grep -rn 'control: "\(vendor\|department\|requester\)"' routes components hooks types`
Expected: ไม่พบ

- [ ] **Step 4: บันทึกการตัดสินใจลง spec** — แก้ `docs/superpowers/specs/2026-09-29-lazy-lookup-phase3a-routes-design.md`:

§3.1 ต่อท้ายบล็อก type `EntityFilterSource`:
```md
เพิ่มระหว่างลงมือ: `bareIds?: boolean` — ค่า URL เป็น id เปล่าคั่น `,` (ตัวกรองผู้ใช้ของ
activity-log / user-activity ส่งเป็น query param `actor_id=` แยก ไม่ผ่าน `filter=`) ·
`EntityMultiFilter` อ่านค่าด้วย `clauseTokens` จึงรับได้ทั้งรูป `<col>|string:a,b`, รูปเก่าของ
`MultiSelectFilter` (`<col>|string:a,<col>|string:b` — backend ตีความเท่ากับ IN, probe 924=924)
และ id เปล่า
```
§3.5 ต่อท้ายตาราง:
```md
ผลตอนลงมือ:
- IA adjustment type และ RFP template ใช้ `serverFilter: null` (โค้ดเดิมไม่กรอง และหน้า list
  ต้องกรองใบเก่าที่อ้างของที่ถูกปิดไปแล้วได้) — ขัดกับคอลัมน์ serverFilter ของตาราง แต่ตรงกับ
  กติกา "ตัวที่เดิมไม่กรองให้ใส่ null"
- price list currency: ค่าที่เก็บคือ **รหัส** (`currency_code|string:THB`) → `getId: c => c.code`,
  `idFilterKey: "code"` (currencies รับ `code|string:`)
- user department: เดิมเลือกได้ค่าเดียว → เลือกหลายค่า (users รับ `department_id|string:a,b`)
- SR คลังต้นทาง: `is_active|boolean:true,location_type|enum:inventory,consignment` (enum ต้องอยู่ท้าย)
- `grn-invoice-filter` ทำได้โดยไม่เปลี่ยนค่าที่เก็บ: `useLookupPagination` บน GRN list
  (`sort=invoice_no:asc`, perpage 50, search ที่ server) แล้ว distinct เลขที่ — ไม่ย้ายไปช่วง 4
```
§4 ต่อท้ายตาราง:
```md
ผลตอนลงมือ: activity-log / user-activity — แถวมี `actor_firstname/…/username` มาจาก API แล้ว
ทะเบียนผู้ใช้ทั้งก้อนถูกใช้ทำตัวเลือกของตัวกรองอย่างเดียว จึงไม่มีงาน id→ชื่อ ·
recipe-category list ใช้ `row.parent.name` ที่มากับแถว · eq-component ต้องดึงชื่อหมวดของแถว
(ไม่อยู่ในตารางนี้แต่ใช้ทะเบียนเดียวกับตัวกรอง)
```
§6 ต่อท้าย:
```md
ผล probe endpoint ที่ต้องมี parent (T02 2026-09-29):
- `good-received-notes/vendor/:v/cn` รับ `id|string:` → ส่ง selectedIds
- `products-location-workflow/:from/:to/:wf` และ `products-location-workflow/:loc/:wf` รับ
  `product_id|string:` (ไม่ใช่ `id`) → ส่ง selectedIds + `idFilterKey: "product_id"` และให้ hook ส่ง `filter`
- `user-locations/product/:p` รับ `id|string:` → ส่ง selectedIds เฉพาะเมื่อไม่มี workflowId
- `products/locations/:loc` และ `config/workflows/:wf/products/:p/locations` **เมิน filter** →
  คงการหา label แบบเดิม (`items` + `defaultLabel`)
- `lookup-dataset` — `dashboard-lab/datasets` ไม่ paginate (registry ใน code คืนทั้งชุด) ไม่มี
  `-1` และดึงตาม id ไม่ได้ → ไม่แก้
- `lookup-physical-count-period`: วันที่จาก `tb_inventory_period.start_at/end_at`,
  sort `tb_inventory_period.start_at:desc` ที่ server, search ของ endpoint ไม่ครอบงวด → ค้นในรายการที่โหลดแล้ว
```

- [ ] **Step 5: ตรวจในเบราว์เซอร์ตาม spec §7** (ดูหัวข้อ Manual verification ท้ายแผน) — บันทึกผลแต่ละข้อ ถ้าไม่ผ่าน แก้ในไฟล์ของ task เจ้าของแล้ว commit แยก (`fix(…): …`)

- [ ] **Step 6: Commit**

```bash
git add hooks/use-location.ts docs/superpowers/specs/2026-09-29-lazy-lookup-phase3a-routes-design.md
git commit -m "docs(spec): lazy lookup ช่วง 3a — บันทึกผล probe endpoint ที่มี parent และการตัดสินใจระหว่างลงมือ"
```

---

## Manual verification (spec §7 — แทนเทสต์อัตโนมัติ)

รัน `VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev` (CORS ของ local รับแค่ `localhost:3000`) · login `admin@zebra.com` / BU **T02** · DevTools → Network กรอง `perpage` · **อ่านอย่างเดียว** — DB :4000 คือ shared dev DB ห้ามกด Save/Create/Delete ถ้าไม่ได้ถาม user

| # | ตรวจ | ผ่านเมื่อ | Task |
|---|---|---|---|
| 1 | product list → ตัวกรอง category | เปิด popover แล้วยิง `perpage=30&page=1` (ไม่ใช่ `-1`), เลื่อน → `page=2`, พิมพ์ → `search=` ที่ server · copy URL เปิดแท็บใหม่ → chip ขึ้นชื่อโดยไม่เปิด popover | 4 |
| 2 | URL รูปเก่า `category=product_category_id\|string:<A>,product_category_id\|string:<B>` | chip `<A> +1`, popover ติ๊กทั้งสอง, จำนวนแถวเท่ากับก่อนแก้ (Review Focus 1) | 1, 4 |
| 3 | PR / PO list → ตัวกรอง vendor / แผนก / ผู้ขอ | ทำงานเหมือน PR #197: ค่า URL `vendor_id\|string:…` / `department_id\|string:…` / `requestor_id\|string:…` คงเดิม, chip ขึ้นชื่อ | 1 |
| 4 | PO ใหม่ (manual) | สกุลตั้งต้นถูกตั้งพร้อม rate ทันทีที่เปิดฟอร์ม | 7 |
| 5 | PO จาก price list สกุลต่างประเทศ + throttling Slow 3G | แถวจาง/ติ๊กไม่ได้จนเรตมา; ขั้นสรุป exchange rate ≠ 1 (Review Focus 3) | 7 |
| 6 | spot-check entry / review | ชื่อหน่วยขึ้นครบทุกแถว ไม่มี `units?perpage=-1` | 6 |
| 7 | IA ฟอร์ม stock-in / stock-out | dropdown เหตุผลเฉพาะชนิดที่ตรงกับเอกสาร; ใบเดิมขึ้นชื่อเหตุผลทันที (view mode เป็นชื่อ ไม่ใช่ code) | 8 |
| 8 | activity log / user activity | ชื่อผู้กระทำขึ้น, ตัวกรองผู้ใช้ค้นที่ server ได้, URL `actor_id=<id>,<id>` ไม่มี prefix, request log ส่ง `actor_id=` (Review Focus 2) | 5 |
| 9 | lookup เก่า (vendor ใน PO แก้ไข) ค่าที่อยู่นอกหน้าแรก | ขึ้น `code - name` ทันทีโดยไม่ต้องเปิด popover; ยิง `filter=id\|string:<id>` ครั้งเดียว (Review Focus 5) | 2 |
| 10 | physical count → dropdown งวด | มีรายการ (เดิมว่างเสมอ) เรียงล่าสุดก่อน | 3 |
| 11 | vendor → certificate / product → eco (เปิด-ปิดโหมดแก้ไขหลายรอบ) | ตารางไม่ค้าง, ชื่อ master ขึ้น, ไม่มี id ดิบ (Review Focus 4) | 6, 8 |
| 12 | GRN list → ตัวกรองเลขที่ใบแจ้งหนี้ | โหลดทีละหน้า `sort=invoice_no:asc`, ค่าเดิมใน URL ยังติ๊กอยู่ | 5 |
