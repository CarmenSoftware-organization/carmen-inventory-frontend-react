# ย้าย lookup ไปใช้ Lookup API — design

**วันที่:** 2026-10-07 · **สถานะ:** รอรีวิว · **branch:** `feature/lookup-endpoint`
**backend ที่พึ่งพา:** carmen-turborepo-backend-v2 PR #784 (merge `8f485bb6a`) — spec ฝั่งนั้น `docs/superpowers/specs/2026-10-07-lookup-api-design.md`

## 1. เป้าหมาย

lookup ใน `components/lookup/` ตอนนี้ดึงจาก list endpoint เต็มของแต่ละ entity (`useLookupPagination` + `useUnit`/`useVendor`/…)
backend เพิ่ม endpoint กลาง `GET /api/:bu_code/lookup/:resource` ที่คืน `{ id, code, name, description, status }` แบบเบา
งานนี้ย้าย lookup ไปใช้ endpoint นั้น และปรับพฤติกรรมการค้น/เลื่อนของ lookup ทุกตัว

### ข้อกำหนดที่ผู้ใช้ระบุ

- ใช้ lookup component เดิม (`LookupCombobox`) ค้นหาข้อมูลผ่าน endpoint ใหม่
- หน่วงก่อนยิง API หลังพิมพ์ — ตกลงที่ **400ms** (ผู้ใช้ขอ 2 วินาทีตอนแรก เปลี่ยนเป็น 400ms + spinner หลังคุยกันว่า 2 วินาทีทำให้ดูเหมือนค้าง)
- โหลดหน้าถัดไปเมื่อเลื่อนรายการ (lazy load on scroll)
- lookup ที่ต้องการฟิลด์มากกว่า 5 ตัว → แก้ backend ให้คืนฟิลด์ที่ FE ใช้จริง (แนวทาง: `extra` ราย resource ใน registry) — **เฟส 2**

### แบ่งเฟส

| เฟส | ขอบเขต | repo |
|---|---|---|
| **1 (spec นี้)** | lookup กลุ่ม 1 (12 ตัว) + debounce 400ms + เลื่อนแล้วโหลดล่วงหน้า | FE เท่านั้น ใช้ backend #784 ตามที่ merge แล้ว |
| 2 (spec แยก) | backend เพิ่ม `extra` ฟิลด์ + filter ราย resource แล้ว FE ย้ายกลุ่ม 2 | BE + FE |

## 2. การจัดกลุ่ม lookup (ผลสำรวจ 2026-10-07)

### กลุ่ม 1 — ใช้ 5 ฟิลด์พอ (ย้ายในเฟส 1)

| component | resource | scope | หมายเหตุ |
|---|---|---|---|
| `lookup-unit` | `unit` | ค่าเริ่มต้น | ปุ่ม "+" สร้างใหม่ |
| `lookup-cuisine` | `recipe_cuisine` | 〃 | |
| `lookup-equipment-category` | `recipe_equipment_category` | 〃 | |
| `lookup-extra-cost` | `extra_cost_type` | 〃 | |
| `lookup-shelf` | `location_shelf` | 〃 | |
| `lookup-vendor` | `vendor` | 〃 | caller อ่านแค่ `vendor.name` |
| `lookup-delivery-point` | `delivery_point` | 〃 | caller อ่านแค่ `item.name` |
| `lookup-cn-reason` | `credit_note_reason` | 〃 | ของเดิมส่ง `is_active` ไม่ได้ (400) — endpoint ใหม่กรอง active ให้เอง |
| `lookup-prt` | `pricelist_template` | 〃 | ของเดิมกรอง `status\|string:active` |
| `lookup-product` | `product` | 〃 | ของเดิมกรอง `product_status_type`; label `code — name` |
| `lookup-category` | `product_category` | 〃 | label `code — name` |
| `lookup-department` | `department` | **`all`** | ของเดิมเห็นทั้ง BU — `mine` ของ backend คืนเฉพาะแผนกที่ assign ให้ user |

ตัวกรอง active ที่ไม่สม่ำเสมอของเดิม (`is_active` / `product_status_type` / `status`) หายไปทั้งหมด เพราะ endpoint กรอง active เป็นค่าเริ่มต้น

ก่อนลงมือต้องยืนยันชื่อ resource ทั้ง 12 กับ `LOOKUP_CATALOG` (`apps/backend-gateway/src/application/lookup/lookup-catalog.ts`) และ registry ฝั่ง micro-business อีกรอบ

### กลุ่ม 2 — ต้องเพิ่มที่ backend (เฟส 2)

| component | resource | `extra` | filter เพิ่ม |
|---|---|---|---|
| `lookup-tax-profile` | `tax_profile` | `tax_rate` | — |
| `lookup-currency` | `currency` | `exchange_rate`, `decimal_places` | — |
| `lookup-credit-term` | `credit_term` | `value` | — |
| `lookup-recipe-category` | `recipe_category` | `level` | — |
| `lookup-sub-category` | `product_sub_category` | — | `product_category_id` |
| `lookup-location` | `location` (`all`) | `location_type`, `delivery_point{id,name}` | `location_type` หลายค่า |
| `lookup-user-location` | `location` (`mine`) | เหมือน location | เหมือน location — ต้องยืนยันว่า `mine` คืนชุดเดียวกับ `/user-locations` |
| `lookup-noti-tmpl` | ใหม่: `notification_template` | — | `type` |

### กลุ่ม 3 — ไม่ย้าย

| component | เหตุผล |
|---|---|
| `lookup-item-group` | caller ใช้ 10 ฟิลด์ (deviation limits, flags, `tax_profile_id`, category/sub_category) |
| `lookup-physical-count-period` | ไม่มี code/name — label มาจากวันที่ของงวด |
| `lookup-grn-by-vendor-for-cn` | list เฉพาะทาง (GRN ของ vendor ที่ยังออก CN ได้) |
| `lookup-user` | ไม่มี caller — ลบแยกเป็นงานต่างหาก |
| lookup ที่ไม่ใช้ `useLookupPagination` (thai-*, currency-iso, bu-type, dataset, workflow, product-unit, product-location, …) | นอกขอบเขต |

## 3. สถาปัตยกรรม (เฟส 1)

### 3.1 ไฟล์ใหม่

| ไฟล์ | หน้าที่ |
|---|---|
| `constant/api-endpoints.ts` | เพิ่ม `LOOKUP: (bu) => \`/api/proxy/api/${bu}/lookup\`` ตามรูปแบบ endpoint อื่น |
| `types/lookup.ts` | `LookupItem = { id: string; code: string \| null; name: string \| null; description: string \| null; status: string }` · `LookupResource` = union ของชื่อ resource ที่ FE ใช้จริง (ไม่ดึง catalog ตอน runtime) · `LookupScope = "mine" \| "all"` |
| `hooks/use-lookup-resource.ts` | hook ตัวเดียวแทน `useLookupPagination` + list hook ราย entity |

### 3.2 `useLookupResource(resource, options)`

input:

| option | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `search` | — | คำค้น (debounce แล้วจาก combobox) |
| `scope` | ไม่ส่ง (= `mine` ของ backend) | `"all"` สำหรับ department |
| `selectedIds` | `[]` | id ที่เลือกอยู่ — ดึงชื่อแยกผ่าน `?ids=` |
| `enabled` | `true` | lazy — ไม่ดึงรายการจนกว่าจะเปิด popover (ไม่มีผลกับ `selectedIds`) |
| `filter` | — | กรองฝั่ง client หลังโหลด (เช่น `excludeIds`) ค่าที่เลือกอยู่ผ่านเสมอ |
| `perpage` | 30 | |

output — shape เดียวกับ `useLookupPagination` เพื่อให้ component เปลี่ยนแค่บรรทัดเรียก hook:
`items`, `selectedItems`, `isLoading`, `isLoadingMore`, `hasMore`, `loadMore`, `total`, `error`, `refetch`

กลไก (ยกตรรกะเดิมจาก `hooks/use-lookup-pagination.ts`):
- React Query สองตัว
  - รายการ: query key `["lookup", buCode, resource, scope, search, page]` → `GET …/lookup/:resource?page&perpage&search&scope`
  - ค่าที่เลือก: query key `["lookup", buCode, resource, "ids", ids]` → `GET …/lookup/:resource?ids=a,b` (ส่ง `scope` เดียวกัน) — backend ข้ามตัวกรอง active/page ให้เมื่อมี `ids` จึงแสดงชื่อของค่าที่ถูกปิดใช้งานแล้วได้ (ยืนยันกับ backend จริงตอนลงมือ)
- ต่อท้ายหน้าใหม่และตัดตัวซ้ำด้วย `id`; ทิ้ง response ที่ `paginate.page` ไม่ตรงหน้าที่ขอ
- จำ `pages`/`total` ล่าสุดไว้ ระหว่างโหลดหน้าถัดไป `hasMore` จะได้ไม่หาย
- error → `hasMore = false`
- `loadMore` idempotent (`setPage(p => p === page ? p + 1 : p)`) กัน StrictMode ข้ามหน้า 2
- reset เป็นหน้า 1 เมื่อ `search`/`scope`/`resource` เปลี่ยน

### 3.3 ไฟล์ที่แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `components/lookup/lookup-combobox.tsx` | debounce 150 → **400ms** · spinner ในช่องค้นหาระหว่างที่ค่าที่พิมพ์ ≠ ค่าที่ debounce แล้ว |
| `components/lookup/paged-checklist.tsx` | debounce 150 → 400ms ให้เหมือนกัน |
| `components/ui/virtual-command-list.tsx` | ระยะเริ่มโหลดหน้าถัดไป 50px → **5 แถว** (`5 × estimateSize`) ให้ข้อมูลมาก่อนผู้ใช้เลื่อนถึงท้าย |
| lookup กลุ่ม 1 ทั้ง 12 ไฟล์ | `useLookupPagination({ useListHook })` → `useLookupResource("<resource>", …)` · `getLabel`/`renderItem`/`getSearchValue` อ่านจาก `LookupItem` (`name ?? code ?? ""`) · **props ภายนอกไม่เปลี่ยน** — type ของ item ที่ส่งให้ `onItemChange`/arg ที่สองของ `onValueChange` เปลี่ยนเป็น `LookupItem` ซึ่ง caller ทุกจุดอ่านแค่ `id`/`name` (ยืนยันแล้วในผลสำรวจ §2) |
| `routes/procurement/purchase-request/pr-vendor-pick.test.tsx` | mock endpoint ใหม่แทน list hook ของ vendor |

ปุ่ม "+" สร้างใหม่ (unit, vendor, …): หลังสร้างสำเร็จต้อง invalidate `["lookup", buCode, resource]` เพื่อให้รายการและชื่อของ id ใหม่โหลดใหม่

### 3.4 สิ่งที่ไม่แตะ

- `useLookupPagination` และ list hook เดิม — กลุ่ม 2–3 ยังใช้
- ไม่ทำ component กลางแบบ `<LookupResource resource=…>` — lookup แต่ละตัวมีของเฉพาะ (ปุ่ม "+", `excludeIds`, badge) hook ตัวเดียวพอ

### 3.5 พฤติกรรมการเลื่อน (lazy load)

`VirtualCommandList` เรียก `onLoadMore` เมื่อเลื่อนถึงระยะเริ่มโหลด และโหลดต่อเองถ้าหน้าแรกไม่ล้นกล่อง (`virtual-command-list.tsx:76`) — `useLookupResource` ต้องคืน `loadMore`/`hasMore`/`isLoadingMore` ให้ทำงานกับกลไกนี้ได้ (เป็นข้อกำหนด ไม่ใช่ของแถม)

## 4. Data flow (ตัวอย่าง unit)

1. ฟอร์มเปิด popover ยังไม่เปิด → ยิงแค่ `?ids=<value>` เพื่อเอาชื่อบนปุ่ม (ไม่มีค่า = ไม่ยิง)
2. เปิด popover → `?page=1&perpage=30`
3. พิมพ์ → รอ 400ms (spinner) → `&search=…` กลับหน้า 1 ล้างรายการ
4. เลื่อนจนเหลือ 5 แถวก่อนท้าย → `page+1` ต่อท้าย ตัดตัวซ้ำ
5. response หน้าเก่า/คำค้นเก่าที่ตอบช้า → ทิ้ง

## 5. Error handling

- 4xx/5xx: หยุดแบ่งหน้า, `ApiErrorToaster` กลางแสดง toast — ไม่เพิ่ม UI ใหม่
- **401 จาก `AppIdGuard('lookup.findAll')`**: ถ้าแอป inventory ไม่ใช่ `allow_all` และไม่มี `lookup.findAll` ใน allowlist, `lib/http-client.ts:213` จะ refresh แล้ว 401 ซ้ำ → **เด้ง user ออกหน้า login** โค้ด FE กันไม่ได้ — กันที่ขั้น deploy (§6)

## 6. Deploy

ต่อ environment ตามลำดับ:

1. backend ที่มี #784 ขึ้นก่อน (gateway + business + cluster พร้อมกันตาม lockstep ของ backend)
2. curl ด้วย `x-app-id` ของ inventory จริง: `GET /api/<bu>/lookup/unit` ต้องได้ 200 — ถ้า 401/403 เติม `lookup.findAll` ลง allowlist ก่อน (`allow_all` ตรวจที่ `app-allowlist.store.ts:60`)
3. deploy FE (`vercel --prod` / S3 / GCS ตามช่องทาง)

ไม่มี feature flag — rollback = revert FE เพราะ list endpoint เดิมยังอยู่ครบ

## 7. การตรวจสอบ

ตามความต้องการของผู้ใช้: ไม่เขียนเทสต์ใหม่ (เทสต์เดิมต้องเขียว)

- `bun run typecheck` · `bun run lint` · `bun test:run`
- ตรวจมือในเบราว์เซอร์กับ :4000 หลัง pull backend ให้มี #784 (working tree ตอนเขียน spec อยู่ที่ `460626297` ยังไม่มี):
  - ค่าที่เลือกอยู่หลังหน้าแรก / ถูกปิดใช้งานแล้ว ยังแสดงชื่อ
  - พิมพ์รัว ๆ → 1 request หลังหยุด 400ms, spinner ขึ้นระหว่างรอ
  - เลื่อน → หน้า 2, 3 โหลดก่อนถึงท้าย ไม่มี id ซ้ำ
  - department แสดงทั้ง BU (`scope=all`)
  - ปุ่ม "+" สร้าง unit/vendor ใหม่ → เลือกให้อัตโนมัติและชื่อขึ้น
  - ฟอร์ม PR (vendor pick), product (category/unit), GRN (extra cost), CN (reason) ทำงานเหมือนเดิม

## 8. นอกขอบเขต

- กลุ่ม 2 (เฟส 2 — spec แยก คู่กับ backend) · กลุ่ม 3 · การลบ `lookup-user`
- lookup เอกสาร (PR/PO/GRN/…) — endpoint รองรับแล้วแต่ยังไม่มีหน้าที่ต้องใช้
