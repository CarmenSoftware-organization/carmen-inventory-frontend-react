# Lazy lookup ช่วง 4b — หน้าดูไม่โหลดทะเบียนทั้งก้อน (โหลดเฉพาะตอนแก้ไข)

ต่อจาก 4a (PR #201) · spec 4a: `docs/superpowers/specs/2026-09-29-lazy-lookup-phase4a-fetch-all-pages-design.md`

## 0. การตัดสินใจ (กับ user 2026-09-29)

4a ทำให้ FE ไม่ส่ง `-1` / `>100` แล้ว — 4b เป็นเรื่องความเร็วล้วน · probe T02 (GET) ทำให้เปลี่ยนโจทย์เดิม:

- location ผูกสินค้าเกือบทั้งทะเบียน (1HK01 = 2,590 / 2,595, 1FO02 = 1,840) — การกำหนดสินค้าต้องเห็นทั้งแคตตาล็อก + ติ๊กทั้งหมวดโดยธรรมชาติ
- ดึงสินค้าทั้งก้อนแบบวนหน้า 26 × 100 = 1.49s เทียบก้อนเดียว 1.20s — ต้นทุนจริงคือ payload ~3.2 MB ไม่ใช่จำนวน request
- ต้นไม้กางทีละชั้นต้องรู้หมวดของสินค้าที่เลือกทุกตัวเพื่อ tri-state อยู่ดี

**ทางที่เลือก:** คง UX ของต้นไม้ / Transfer (โหลดทั้งก้อนผ่าน `useProductAll` / `useUserAll`) **แต่ยิงเฉพาะโหมดแก้ไข/เพิ่ม** · โหมดดูใช้ข้อมูลจาก payload ของเอกสารหรือดึงตาม id ·
ตารางสินค้าหน้าดู location ต้องการ Local Name + Inventory Unit ซึ่ง payload ไม่มี → **backend เติมสองฟิลด์ใน `product_location`** (user เลือก)

**นอกขอบเขต:** workflow (`wf-edit-content` / wf-products / wf-stage-users / wf-routing-category-list) — โหมดอ่านอย่างเดียวก็ต้องใช้สินค้าทั้งก้อน (รายการสินค้าในขอบเขต + หมวด routing จากสินค้าที่เลือก ซึ่งอาจเป็นพัน) และเป็นหน้า admin ที่เปิดไม่บ่อย → คง `useUserAll` / `useProductAll` แบบเดิมจาก 4a

## 1. Backend (`carmen-turborepo-backend-v2`) — deploy ก่อน FE

branch `feature/location-product-local-name-unit` จาก `main`

| # | ไฟล์ | งาน |
|---|---|---|
| 1 | `apps/micro-business/src/master/locations/locations.service.ts` `findOne` (~:161-184) | `tb_product.findMany` select เพิ่ม `local_name`, `inventory_unit_id`, `inventory_unit_name`, `tb_unit: { select: { name: true } }` · map ของ `product_location` เพิ่ม `local_name: info?.local_name ?? null` และ `inventory_unit: info ? { id: info.inventory_unit_id, name: info.tb_unit?.name ?? info.inventory_unit_name } : null` (รูปเดียวกับ `products.service.ts:286-289`) |
| 2 | `apps/micro-business/src/master/locations/dto/location.serializer.ts` `ProductLocationEmbeddedSchema` (~:21-32) | เพิ่ม `local_name: z.string().nullable().optional()` และ `inventory_unit: z.object({ id: z.string(), name: z.string().nullable().optional() }).nullable().optional()` |
| 3 | `apps/backend-gateway/src/common/dto/location/location.serializer.ts` `ProductLocationEmbeddedSchema` (~:21-32) | เหมือนข้อ 2 (ไม่งั้น gateway ตัดทิ้ง — ดู memory backend-add-field-serializer-gotcha) |
| 4 | `apps/backend-gateway/src/config/config_locations/config_locations.controller.ts` (~:91) | ข้อความ swagger ของ `product_location` ระบุสองฟิลด์ใหม่ |

- เพิ่มฟิลด์อย่างเดียว (additive) — mobile / ผู้เรียกเดิมไม่พัง · `product_location` สร้างที่จุดเดียว
- ไม่เขียนเทสต์ใหม่ (preference ของ user) · เทสต์เดิมของ `apps/micro-business` locations และ `apps/backend-gateway` config_locations ต้องผ่าน (รันในเครื่องด้วย jest — CI backend ไม่รันเพราะ billing; ห้าม `bun test`)
- ตรวจ: `GET /api/config/T02/locations/<1HK01 id>` → `product_location[0]` มี `local_name` และ `inventory_unit {id,name}` (GET อย่างเดียว ผ่าน :4000 local หลังรัน backend branch นี้)

## 2. Frontend (`feature/lazy-lookup-phase4b` ต่อจาก 4a)

### 2.1 ลบ `useAllUsers` / `useAllProducts`

- ลบ `hooks/use-all-users.ts`, `hooks/use-all-products.ts`
- ผู้เรียกทั้งหมด (location-form, department-form, plt-item-fields) เปลี่ยนเป็น `useUserAll` (`@/hooks/use-user`) / `useProductAll` (`@/hooks/use-product`) ของ 4a
- cache: `useAllUsers` เดิมใช้ `CACHE_NORMAL` แต่ crud ของ user ใช้ default `CACHE_STATIC` → call site ของ `useUserAll` ส่ง `...CACHE_NORMAL` ใน options เพื่อคงพฤติกรรมเดิม (ผู้ใช้ถูกสร้างจากอีกแอป invalidate ไม่ถึง) · product crud เป็น `CACHE_NORMAL` อยู่แล้ว
- characterization test สามไฟล์ที่ mock `@/hooks/use-all-users` / `@/hooks/use-all-products` → แก้ mock ให้ตรงโมดูลใหม่ (ห้ามลบ assertion)

### 2.2 location-form (`routes/config/location/location-form.tsx`)

- `useUserAll` / `useProductAll` ได้ `{ enabled: !isView }` — ต้องย้ายการเรียกไปอยู่หลังบรรทัดที่ได้ `isView` จาก `f` (ตอนนี้ hook อยู่บรรทัด ~78 ก่อน `f` ~151) · ตรวจว่าไม่มีอะไรก่อน `f` ใช้ `allUsers`/`allProducts`
- `enrichedUsers` (โหมดดู): อีเมลจาก `useEntitiesByIds({ useListHook: useUser, ids: location.user_location ids, idFilterKey: "user_id", enabled: isView })` แทน `allUsers`
- `enrichedProducts` (โหมดดู): ใช้ `local_name` / `inventory_unit` จาก `location.product_location` ตรง ๆ — ลบ `productMap`
- `types/location.ts` `ProductLocation` เพิ่ม `local_name?: string | null` และ `inventory_unit?: { id: string; name?: string | null } | null`
- Transfer / TreeProductLookup โหมดแก้ไข/เพิ่ม: ไม่เปลี่ยน (ใช้ `allUsers` / `allProducts` เหมือนเดิม)

### 2.3 department-form (`routes/config/department/department-form.tsx`)

- `useUserAll(undefined, { ...CACHE_NORMAL, enabled: !isView })` — ย้ายไปหลัง `f` เช่นกัน
- `emailMap` (โหมดดู): `useEntitiesByIds({ useListHook: useUser, ids: [...department_users ids, ...hod_users ids] (unique), idFilterKey: "user_id", enabled: isView })`
- Transfer ทั้งสอง (dept users ที่กรอง "ยังไม่มีแผนก หรืออยู่แผนกนี้" + HOD ทุกคน) ไม่เปลี่ยน

### 2.4 plt-item-fields (`routes/vendor-management/price-list-template/plt-item-fields.tsx`)

- `useProductAll(undefined, { enabled: !isView })` · `removeProductName` / `getProductName` มี fallback ไป `priceListTemplate.products` อยู่แล้ว — ไม่เปลี่ยน

### 2.5 เกณฑ์เสร็จ

- `grep -rn "use-all-users\|use-all-products\|useAllUsers\|useAllProducts" components hooks routes lib` = 0
- typecheck + lint (0 error) + `bun test:run` ทั้งชุดผ่าน · ไม่เขียนเทสต์ใหม่

## 3. ลำดับ deploy / ความเสี่ยง

- **BE ก่อน FE** — FE ขึ้นก่อน = คอลัมน์ Local Name / Inventory Unit ว่างในหน้าดู location (ไม่ error) · ระบุใน PR ทั้งสอง
- location / แผนกที่มีผู้ใช้ > 100 คน: อีเมลคนที่ 101+ ว่างในหน้าดู (เพดาน id ของ `useEntitiesByIds` จาก 4a)
- ไม่มี migration · rollback = revert PR ใดก็ได้ (additive)

## 4. ตรวจในเบราว์เซอร์ (อ่านอย่างเดียว :4000 — ต้องรัน backend branch ข้อ 1 ในเครื่อง)

1. location 1HK01 หน้าดู: ตารางสินค้ามี Local Name + Inventory Unit · อีเมลผู้ใช้ขึ้น · Network ไม่มี `/products?…perpage=100&page=` ชุด 26 หน้า และไม่มี `/users` ทั้งทะเบียน (มีแค่ `users?filter=user_id|string:…`)
2. location กด Edit: Transfer ผู้ใช้ครบ · ต้นไม้สินค้าครบ ติ๊กตรงกับของเดิม (ไม่กด Save)
3. department หน้าดู: อีเมลผู้ใช้แผนก + HOD ขึ้น · ไม่มีการดึงผู้ใช้ทั้งทะเบียน · กด Edit: Transfer ทั้งสองครบ
4. price list template หน้าดู: ไม่มีการดึงสินค้าทั้งทะเบียน · กด Edit/เพิ่ม: ต้นไม้ขึ้น ชื่อการ์ดถูก
5. workflow edit: ยังทำงานเหมือนเดิม (นอกขอบเขต)
