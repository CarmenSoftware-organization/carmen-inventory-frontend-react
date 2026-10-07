# Lookup API เฟส 2 — ฟิลด์เพิ่ม + filter ราย resource — design

**วันที่:** 2026-10-07 · **สถานะ:** อนุมัติแล้ว — plan: `docs/superpowers/plans/2026-10-07-lookup-api-phase2.md`
**repo:** carmen-turborepo-backend-v2 (micro-business + gateway) และ carmen-inventory-frontend-react
**FE branch:** `feature/lookup-endpoint-phase2` (stack บน `feature/lookup-endpoint` / PR #257) · **BE branch:** `feature/lookup-extra-fields`
**ต่อจาก:** `docs/superpowers/specs/2026-10-07-lookup-endpoint-migration-design.md` (เฟส 1) และ backend `docs/superpowers/specs/2026-10-07-lookup-api-design.md`

## 1. เป้าหมาย

เฟส 1 ย้าย lookup ที่ใช้แค่ id/ชื่อไปใช้ `GET /api/:bu_code/lookup/:resource` แล้ว ส่วน lookup ที่เหลืออีก 9 ตัวต้องการฟิลด์หรือ filter ที่ endpoint ยังไม่มี
เฟส 2 แก้ backend ให้ registry ประกาศ **ฟิลด์เพิ่ม (extra)** และ **filter ที่อนุญาต** ราย resource ได้ จากนั้น FE ย้าย lookup ทั้ง 9 ตัว

### ข้อตกลงกับผู้ใช้

- response ต้อง "เท่ากับที่ FE ต้องการ" → ฟิลด์เพิ่ม **วางแบนข้าง 5 ฟิลด์หลัก** (ไม่ห่อใน `extra`) caller ฝั่ง FE ที่อ่าน `currency.exchange_rate` ฯลฯ ไม่ต้องแก้
- registry ประกาศ extra/filter ราย resource (ไม่คืนแถวเต็มของ list เดิม)
- แก้บั๊ก product: กรอง active ด้วย `product_status_type` แทน `is_active` ที่ไม่มีใครเขียน
- มี jest test หนึ่งตัวใน backend กัน catalog ของ gateway กับ registry ของ micro หลุดซิงก์ (ข้อยกเว้นของ "ไม่เขียนเทสต์")

### นอกขอบเขต

- `lookup-item-group` (ใช้ 10 ฟิลด์), `lookup-physical-count-period`, `lookup-grn-by-vendor-for-cn`, `lookup-user` — เหตุผลตามเฟส 1 §2 กลุ่ม 3
- ข้อค้างเล็กจากเฟส 1 (cache 60s, auto-fill ระหว่าง refetch, comment เก่า, padding) — แยกทำ

## 2. Backend

### 2.1 Types — `apps/micro-business/src/master/lookup/lookup.types.ts`

```ts
type LookupExtraField =
  | { kind: 'string' | 'number' | 'boolean'; column: string }
  | { kind: 'object'; fields: Record<string, string> }; // ชื่อฟิลด์ย่อย → คอลัมน์

interface LookupResourceDef {
  // ...ของเดิม
  extra?: Record<string, LookupExtraField>; // ชื่อฟิลด์ใน response → วิธีอ่าน
  filters?: Record<string, LookupFilterDef>; // ชื่อ filter ที่อนุญาต → คอลัมน์ + ชุดค่าที่ยอมรับ
}

interface LookupFilterDef {
  column: string;
  enumValues?: readonly string[]; // ค่านอกชุดนี้ไม่ตรงกับแถวใด (ไม่ส่งเข้า Prisma ซึ่งจะ 500)
  uuid?: boolean;                 // ค่าที่ไม่ใช่ uuid ไม่ตรงกับแถวใด
}
```

`LookupItem` (output) ขยายเป็น `LookupItem & Record<string, unknown>` — JSDoc อธิบายว่าคีย์เพิ่มมาจาก `extra` ของ registry

### 2.2 Registry — `lookup-registry.ts`

| resource | extra | filters | อื่น ๆ |
|---|---|---|---|
| `product` | — | — | `status: enumStatus('product_status_type', enum_product_status_type, ['inactive', 'discontinued'])` — lookup เดิมกรอง `active` อย่างเดียว |
| `tax_profile` | `tax_rate`: number | — | |
| `currency` | `exchange_rate`: number, `decimal_places`: number | — | |
| `credit_term` | `value`: number | — | |
| `recipe_category` | `level`: number | — | |
| `product_sub_category` | — | `product_category_id` | |
| `location` | `location_type`: string, `delivery_point`: object `{ id: 'delivery_point_id', name: 'delivery_point_name' }` | `location_type` | `tb_location` เก็บ delivery point แบบ denormalized ไม่ต้อง join |
| `notification_template` (**ใหม่**) | — | `type` | `defineMaster('tb_notification_template', { code: undefined, … })` — ตารางไม่มี `code`; `type` เป็น `enum_notification_channel` |

ชื่อคอลัมน์และ enum ทุกตัวต้องยืนยันกับ `packages/prisma-shared-schema-tenant/prisma/schema.prisma` ตอนทำ plan

### 2.3 Query builder — `lookup-query.builder.ts`

- `buildSelect`: เพิ่มคอลัมน์ทุกตัวของ `extra` (รวมคอลัมน์ย่อยของ object)
- `toLookupItem`: อ่าน extra ตาม `kind`
  - `number` → `Number(value)` (`Decimal` ของ Prisma แปลงได้) · null คืน `null`
  - `string` / `boolean` → ค่าตรง ๆ หรือ `null`
  - `object` → `{ field: value, … }` ถ้าคอลัมน์ย่อยทุกตัวเป็น null คืน `null`
  - วางแบนข้าง `id/code/name/description/status`
- `resolveColumn`: อ่าน `def.filters[field]` เพิ่ม → filter และ sort ใช้ชื่อเหล่านี้ได้

### 2.4 ตรวจ registry ตอนโหลด

ฟังก์ชันตรวจที่รันตอน module โหลด: ชื่อใน `extra` และ `filters` ห้ามซ้ำกับ `id/code/name/description/status` (ซ้ำ = throw ตอน boot)

### 2.5 Gateway — `apps/backend-gateway/src/application/lookup/`

- `LOOKUP_FIELDS` (`lookup.service.ts:13`) เปลี่ยนเป็น `{code,name,description,status} ∪ catalog[resource].filters`
- `LookupCatalogEntry` เพิ่ม `filters?: readonly string[]` · `lookup-catalog.ts` ประกาศ filter ของ `product_sub_category`, `location`, `notification_template` และเพิ่ม `notification_template` เป็น master
- catalog endpoint (`GET /lookup`) คืน `filters` ด้วย
- Swagger response: เพิ่ม JSDoc/description ว่าแถวอาจมีคีย์เพิ่มตาม resource

### 2.6 เทสต์กันหลุดซิงก์ (jest)

`apps/backend-gateway/src/application/lookup/lookup-catalog.spec.ts` — `require` registry ของ micro-business ด้วย path ที่คำนวณตอนรัน (`check-types` ของ gateway ใช้ `--rootDir .` import แบบ static ข้ามแอปจะได้ TS6059): ทุก resource ใน `LOOKUP_CATALOG` ต้องมีใน `LOOKUP_REGISTRY` และ `filters` ของสองที่ต้องตรงกัน

### 2.7 รูปแบบ filter ที่ต้องรู้

parser ของ gateway (`shared-dto/paginate.dto.ts:19`) ใช้ทุกอย่างก่อน `:` เป็นชื่อ key — lookup จึงต้องส่ง `filter=location_type:inventory,direct` **ไม่มี `|string`** (ถ้าใส่ key จะเป็น `location_type|string` แล้วไม่ผ่าน whitelist → 400)

## 3. Frontend

### 3.1 Types — `types/lookup.ts`

- `LookupResource` เพิ่ม `product`, `tax_profile`, `currency`, `credit_term`, `recipe_category`, `product_sub_category`, `location`, `notification_template`
- type ราย resource:
  - `TaxProfileLookup = LookupItem & { tax_rate: number | null }`
  - `CurrencyLookup = LookupItem & { exchange_rate: number | null; decimal_places: number | null }`
  - `CreditTermLookup = LookupItem & { value: number | null }`
  - `RecipeCategoryLookup = LookupItem & { level: number | null }`
  - `LocationLookup = LookupItem & { location_type: INVENTORY_TYPE; delivery_point: { id: string | null; name: string | null } | null }`
- `LOOKUP_EXTRA_FIELDS: Partial<Record<LookupResource, readonly string[]>>` — รายชื่อ extra ที่ hook ใช้ตรวจ (§3.2)

### 3.2 `useLookupResource`

- generic: `useLookupResource<T extends LookupItem = LookupItem>(resource, opts)` คืน `items: T[]`, `selectedItems: T[]`, `filter?: (item: T) => boolean`
- option ใหม่ `serverFilter?: Record<string, string | readonly string[] | undefined>` → `filter=k:v1,v2;k2:v` (ข้ามค่า undefined/ว่าง; รูปแบบตาม §2.7) อยู่ใน query key ทั้งรายการและ `ids` · เปลี่ยนแล้วเริ่มหน้า 1 ใหม่
- **ตรวจ extra:** ถ้า resource มีใน `LOOKUP_EXTRA_FIELDS` และแถวแรกของ response ไม่มีคีย์ใดคีย์หนึ่ง → `queryFn` throw `ApiError` ("Lookup <resource> is missing <field> — backend older than this frontend") แทนการปล่อยค่า `undefined` ให้ฟอร์มคำนวณภาษี/อัตราแลกเปลี่ยนเป็น 0 เงียบ ๆ

### 3.3 lookup ที่ย้าย

| component | resource / scope | serverFilter | callback type ใหม่ |
|---|---|---|---|
| `lookup-product` | `product` | — | `LookupItem` (คืนโค้ดเฟส 1 ที่ revert ไว้ + `pl-item-cells.tsx`) |
| `lookup-tax-profile` | `tax_profile` | — | ส่ง `tp.tax_rate ?? 0`, `lookupLabel(tp)` ให้ caller เหมือนเดิม |
| `lookup-currency` | `currency` | — | `CurrencyLookup` |
| `lookup-credit-term` | `credit_term` | — | `CreditTermLookup` |
| `lookup-recipe-category` | `recipe_category` | — | `RecipeCategoryLookup` |
| `lookup-sub-category` | `product_sub_category` | `{ product_category_id }` | `LookupItem` |
| `lookup-location` | `location`, `scope: "all"` | `{ location_type }` | `LocationLookup` |
| `lookup-user-location` | `location`, `scope: "mine"` | `{ location_type }` | `LocationLookup` · คง eager เมื่อไม่ส่ง `lazy` |
| `lookup-noti-tmpl` | `notification_template` | `{ type }` | — |

caller ที่ต้องแก้ (ยืนยันด้วย typecheck): ที่ประกาศ type `Currency`/`Location`/`CreditTerm`/`RecipeCategory` ตรง ๆ · `pd-tab-locations.tsx:213` `loc.is_active` → `loc.status === "active"` · ที่อ่าน `exchange_rate`/`decimal_places`/`value`/`level` ซึ่งตอนนี้เป็น `number | null` → ใส่ค่า default เดียวกับที่ฟอร์มใช้อยู่

ความต่างที่ยอมรับ: `user-location` ใหม่กรอง `deleted_at: null` ของการ assign ด้วย (`/user-locations` เดิมไม่กรอง) — คลังที่ถูกถอนสิทธิ์จะไม่โผล่ ถูกต้องกว่าเดิม

## 4. Deploy

ต่อ environment: **backend (gateway + business พร้อมกัน) ก่อน FE เสมอ**

FE ขึ้นก่อน = filter ใหม่ได้ 400 และ extra หาย → §3.2 ทำให้ lookup แสดง error แทนคำนวณผิดเงียบ ๆ
backend ขึ้นก่อนโดย FE ยังเป็นเฟส 1/เดิม = ไม่กระทบ (ฟิลด์เพิ่มถูกละเลย; product lookup ฝั่ง FE ยังไม่ใช้ endpoint)
FE เฟส 2 merge ได้หลัง PR #257 เท่านั้น (stack) — **ห้าม `--delete-branch` ตอน merge #257** ([[stacked-pr-merge-no-delete-branch]])

## 5. การตรวจสอบ

- BE: `bun run check-types` · eslint ไฟล์ที่แตะ · jest เฉพาะ `lookup-catalog.spec.ts` + เทสต์เดิมของ lookup · `bun run boot-check backend-gateway micro-business` · `gen:rpc-contract` + `audit:tcp-drift` ถ้า contract เปลี่ยน
- BE curl (local): 8 resource มี extra ครบ, ตัวเลขเป็น number; `product` ไม่คืนสินค้าที่ `product_status_type=inactive`; `product_sub_category?filter=product_category_id:<id>` กรองถูก; `location?filter=location_type:inventory` กรองถูก; `location?filter=location_type|string:x` → 400
- FE: typecheck · lint ไฟล์ที่แตะ · `bun test:run`
- FE เบราว์เซอร์: PO เลือก tax profile → rate ขึ้น · PR เลือก currency → exchange rate/ทศนิยมถูก · PO/GRN เลือก credit term → วันครบกำหนดคำนวณ · product form: sub-category กรองตาม category · PR item location แสดง delivery point · ตั้งสินค้าเป็น inactive แล้วไม่โผล่ใน product lookup (ใช้สินค้าที่ปิดอยู่แล้วใน dev DB ไม่สร้างใหม่) · workflow stage notifications กรองตามช่องทาง
