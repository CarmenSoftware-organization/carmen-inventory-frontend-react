# สรุปขนาดไฟล์แนบต่อ BU ในหน้า Document

วันที่: 2026-08-13
สถานะ: อนุมัติดีไซน์แล้ว รอทำแผน implement

## 1. ปัญหาและเป้าหมาย

หน้า `/system-admin/document` แสดงไฟล์แนบทั้งหมดของหน่วยธุรกิจ (BU) เป็นตารางแบ่งหน้า
แต่ผู้ดูแลระบบมองไม่เห็นภาพรวมว่า **BU นี้ใช้พื้นที่เก็บไฟล์ไปเท่าไร และพื้นที่นั้นถูกใช้ไปกับโมดูลไหน**

เป้าหมาย: เพิ่มแถบสรุปเหนือตาราง แสดงขนาดรวมและจำนวนไฟล์ของทั้ง BU พร้อมแจกแจงตามโมดูลต้นทาง

### ขอบเขต

- ยอดสรุปเป็นของ **ทั้ง BU เสมอ** ไม่ขยับตาม search / filter / หน้าที่เปิดอยู่ในตาราง
- แจกแจงตาม **โมดูลต้นทาง** (คอลัมน์ `reference_type`) ไม่ใช่ตามประเภทไฟล์
- อ่านอย่างเดียว กดที่รายการโมดูลแล้วไม่เกิดอะไร

### สิ่งที่ตั้งใจไม่ทำ

- กดโมดูลใน Sheet แล้วกรองตาราง (backend รองรับ `reference_type` filter อยู่แล้ว แต่ต้องเพิ่ม filter field + ต่อ `useListFilters` — เก็บไว้ทำทีหลังถ้ามีคนขอ)
- สรุปตาม content-type (ซ้ำกับตัวกรองประเภทไฟล์ที่หน้านี้มีอยู่แล้ว)
- โควตา / ลิมิตพื้นที่ / การแจ้งเตือนเมื่อใกล้เต็ม
- เทียบข้าม BU (ต้องใช้ endpoint ระดับ platform คนละเรื่องกัน)
- กราฟวงกลมหรือ chart library

## 2. ทำไมต้องแก้ backend

รวมขนาดฝั่ง frontend ให้ครบทุกไฟล์ทำไม่ได้:

- `files.controller.ts:670` cap `perpage` ไว้ที่ 100 → BU ที่มี 1,240 ไฟล์ต้องยิง 13 request
- `document-management.service.ts:314` gateway สร้าง **presigned URL ให้ทุกไฟล์ในทุกหน้าที่ดึง** → ไล่ดึงทั้งหมดคือสร้าง presigned URL ทิ้ง 1,240 ครั้งต่อการเปิดหน้าหนึ่งครั้ง ไม่ scale

ข้อมูลอยู่ใน Postgres (`tb_file_tag`) ไม่ใช่การ list จาก MinIO — `SUM(size) ... GROUP BY reference_type`
เป็นคิวรีเดียวที่ใช้ index `@@index([bu_code, deleted_at])` ที่มีอยู่แล้ว (`schema.prisma:43`)

จึงเลือกแนวทาง: **endpoint สรุปใหม่ พร้อม `api_name` ของตัวเอง** ตามขนบเดิมของโปรเจกต์ทุก endpoint
แลกกับขั้นตอน deploy ที่ต้องเติม allowlist เอง (ดูข้อ 8)

## 3. Backend — `carmen-turborepo-backend-v2` / `micro-file`

### 3.1 `apps/micro-file/src/files/files.service.ts`

เพิ่มเมธอด `summarizeFiles({ bu_code })` วางถัดจาก `searchFiles` (บรรทัด 735)

```sql
SELECT reference_type,
       count(*)::int              AS file_count,
       COALESCE(sum(size), 0)::bigint AS total_size
FROM   <table>
WHERE  deleted_at IS NULL AND bu_code = $1
GROUP  BY reference_type
ORDER  BY total_size DESC
```

- `<table>` ต้อง schema-qualify แบบเดียวกับ `searchFiles` (บรรทัด 788): raw SQL ไม่ถูก qualify
  โดย PrismaPg adapter และ `search_path` ค้างที่ `public` → ถ้าเขียน `"tb_file_tag"` เปล่า ๆ จะ 42P01
- **กับดัก BigInt:** `size` เป็น `Int` (int4, `schema.prisma:26`) → `sum()` ของ Postgres คืน `bigint`
  → Prisma `$queryRaw` map เป็น `BigInt` ของ JS → `JSON.stringify` **throw `TypeError` ทันที**
  ต้องแปลงเป็น `Number(row.total_size)` ในเซอร์วิสก่อนคืนค่า
  (ปลอดภัย: 9 PB ยังต่ำกว่า `Number.MAX_SAFE_INTEGER`)
- คืนค่า `{ total_size, total_count, by_reference_type: [...] }` โดยรวม `total_*` จากผลลัพธ์ที่ group แล้ว
  (ไม่ต้องยิงคิวรีที่สอง)

### 3.2 `apps/micro-file/src/files/files.controller.ts`

เพิ่ม `@MessagePattern({ cmd: 'files.summary', service: 'files' })` วางถัดจาก `listFiles` (บรรทัด 644)
โครง try/catch + `createAuditContext` + `runWithAuditContext` + `resSuccessWithData` ตามแบบ `listFiles`

## 4. Backend — `carmen-turborepo-backend-v2` / `backend-gateway`

### 4.1 `document-management.controller.ts`

เพิ่ม `GET /api/:bu_code/documents/summary`

- **ต้องประกาศก่อน `@Get(':filetoken')`** (ปัจจุบันอยู่บรรทัด 266) NestJS จับ route ตามลำดับที่ประกาศ
  ถ้าประกาศทีหลัง `summary` จะถูกจับเป็น `filetoken` แล้วคืน 404
- guard: `@UseGuards(new AppIdGuard('documents.summary'))`
- decorator เอกสาร: `@ApiOperation` / `@ApiParam` / `@ApiStdResponse` ตามแบบ `listDocuments`
- **ไม่ใส่** `@EnrichAuditUsers()` — ผลลัพธ์เป็นตัวเลขรวม ไม่มีฟิลด์ audit

### 4.2 `document-management.service.ts`

เพิ่ม `getDocumentSummary(bu_code, user_id)` — forward ไป `files.summary`
**ไม่ resolve presigned URL** (ต่างจาก `listDocuments` ที่ทำ `Promise.all` ต่อเอกสาร)

### 4.3 Catalog

รัน `bun run scripts/generate-app-api-catalog/run.ts` เพื่ออัปเดต `app-api-catalog.generated.ts`
โมดูล `documents` จะได้ `api_names` เพิ่มเป็น `documents.summary`

### 4.4 รูปแบบตอบกลับ

```json
{
  "data": {
    "total_size": 3972891234,
    "total_count": 1240,
    "by_reference_type": [
      { "reference_type": "purchase_request",  "size": 1288490188, "count": 412 },
      { "reference_type": null,                "size": 1073741824, "count": 211 },
      { "reference_type": "good_received_note","size": 933232640,  "count": 318 }
    ]
  }
}
```

`by_reference_type` เรียงจากมากไปน้อยมาจาก backend แล้ว frontend ไม่ต้องเรียงซ้ำ

หมายเหตุ: controller นี้ตอบด้วย `this.respond(res, result)` ตรง ๆ ไม่ได้ใช้ `@Serialize`
จึงไม่ติดกับดักที่ schema ฝั่ง gateway strip ฟิลด์ทิ้ง

## 5. Frontend — `carmen-inventory-frontend-react`

### 5.1 `lib/format-file-size.ts` (ไฟล์ใหม่)

ย้าย `formatFileSize` ออกจาก `routes/system-admin/document/use-document-table.tsx:42` มาไว้ที่นี่
เพราะจะถูกใช้ทั้งในตาราง แถบสรุป และ Sheet

**ต้องขยายหน่วยด้วย** — ของเดิมหยุดที่ MB ทำให้ยอดรวมระดับ GB แสดงเป็น `"3788.8 MB"`
เพิ่ม GB และ TB โดยคงรูปแบบเดิม (`.toFixed(1)`) ไว้ทุกหน่วย เพื่อให้ค่าที่แสดงในตารางไม่เปลี่ยน

เคสขอบ: `bytes` ที่เป็น `NaN` / ติดลบ / `undefined` → คืน `"0 B"`

### 5.2 `types/document.ts`

```ts
export interface DocumentSummaryRow {
  reference_type: string | null;
  size: number;
  count: number;
}

export interface DocumentSummary {
  total_size: number;
  total_count: number;
  by_reference_type: DocumentSummaryRow[];
}
```

### 5.3 `constant/api-endpoints.ts`

เพิ่มถัดจาก `DOCUMENTS` (บรรทัด 90):
`DOCUMENTS_SUMMARY: (buCode: string) => \`/api/proxy/api/${buCode}/documents/summary\``

### 5.4 `hooks/use-document.ts`

เพิ่ม `useDocumentSummary()`

- query key `[QUERY_KEYS.DOCUMENTS, buCode, "summary"]`
- `CACHE_DYNAMIC` เหมือน `useDocument` (staleTime 1 นาที)
- `enabled: !!buCode`
- `useUploadDocument` (เรียก `invalidateQueries` ตรง ๆ) และ `useDeleteDocument` (ผ่าน `invalidateKeys`
  ของ `use-api-mutation.ts:201`) invalidate `[QUERY_KEYS.DOCUMENTS]` อยู่แล้ว TanStack Query จับคู่
  query key แบบ prefix จึงครอบ key ของ summary ด้วย — ยอดอัปเดตเองหลังอัปโหลด/ลบ ไม่ต้องแก้เพิ่ม

### 5.5 `routes/system-admin/document/document-reference-labels.ts` (ไฟล์ใหม่)

map `reference_type` → key ใต้ `modules.*`

31 ใน 39 ค่าที่ backend ใช้จริงแมปเข้ากับ key ที่มีอยู่แล้วได้:

| reference_type | i18n key |
|---|---|
| `config_running_code` | `modules.runningCode` |
| `credit_note` | `modules.creditNote` |
| `credit_term` | `modules.creditTerm` |
| `currency` | `modules.currency` |
| `delivery_point` | `modules.deliveryPoint` |
| `department` | `modules.department` |
| `exchange_rate` | `modules.exchangeRate` |
| `extra_cost` | `modules.extraCost` |
| `good_received_note` | `modules.goodsReceiveNote` |
| `location` | `modules.storeLocation` |
| `period` | `modules.period` |
| `physical_count` | `modules.physicalCount` |
| `pricelist` | `modules.priceList` |
| `pricelist_template` | `modules.priceListTemplate` |
| `product` | `modules.product` |
| `product_category` | `modules.productCategory` |
| `product_master_eco_label` | `modules.eco` |
| `purchase_order` | `modules.purchaseOrder` |
| `purchase_request` | `modules.purchaseRequest` |
| `purchase_request_template` | `modules.purchaseRequestTemplate` |
| `recipe` | `modules.operationRecipe` |
| `recipe_equipment` | `modules.operationEquipment` |
| `request_for_pricing` | `modules.requestPriceList` |
| `spot_check` | `modules.spotCheck` |
| `store_requisition` | `modules.storeRequisition` |
| `tax_profile` | `modules.taxProfile` |
| `unit` | `modules.unit` |
| `vendor` | `modules.vendor` |
| `vendor_business_type` | `modules.businessType` |
| `vendor_master_certificate` | `modules.certification` |
| `workflow` | `modules.workflow` |

อีก 8 ค่าต้องเพิ่ม key ใหม่ใต้ `modules.*` ทั้ง `en.json` และ `th.json`:
`dimension` · `news` · `physical_count_period` · `product_item_group` · `product_sub_category` ·
`recipe_preparation_step` · `stock_in` · `stock_out`

**การจัดการค่าที่ไม่มีใน map:**

- `reference_type === null` → ป้าย "อัปโหลดโดยตรง" (ไฟล์ที่อัปจากหน้านี้ตรง ๆ — `use-document.ts:60`
  ส่งแค่ field `file` ไม่ส่ง `reference_type`)
- ค่าที่ยังไม่มี label → **แสดงสตริงดิบตามจริง** ไม่ยุบเป็น "อื่น ๆ"
  เหตุผล: หน้านี้เป็นเครื่องมือของผู้ดูแลระบบ การเห็นว่ามีถังที่ระบบยังไม่รู้จักคือข้อมูลที่มีค่า
  และทำให้ `reference_type` ใหม่ที่ backend เพิ่มโผล่เองโดยไม่ต้อง release frontend

### 5.6 `routes/system-admin/document/document-summary-bar.tsx` (ไฟล์ใหม่)

แถบเดียวคั่นระหว่างส่วนหัวกับช่องค้นหา:

```
┌──────────────────────────────────────────────┐
│ 3.7 GB · 1,240 ไฟล์                            │
│ ใบขอซื้อ 1.2 GB · ใบรับสินค้า 890 MB · สินค้า 410 MB   ดูทั้งหมด › │
└──────────────────────────────────────────────┘
```

- บรรทัดแรก: ขนาดรวมเด่นที่สุด ตามด้วยจำนวนไฟล์
- บรรทัดสอง: 3 โมดูลแรกจาก `by_reference_type` (เรียงจาก backend แล้ว) + ปุ่มเปิด Sheet
- จอแคบ: ยังแสดง 3 โมดูลเท่าเดิม (**ไม่ตัดเหลือ 2** ตามที่ระบุไว้เดิม) ใช้ CSS `truncate`
  ตัดข้อความที่ยาวเกินพื้นที่ด้วย ellipsis แทนการคำนวณ breakpoint แยก ปุ่ม "ดูทั้งหมด" อยู่บรรทัด
  เดียวกันเสมอ ไม่ลงบรรทัดใหม่ — implement แบบนี้แทน เพราะไม่ต้องดูแล breakpoint เพิ่ม และผลลัพธ์
  ที่ได้เข้าใจง่ายพอกัน (ดู `routes/system-admin/document/document-summary-bar.tsx`)

### 5.7 `routes/system-admin/document/document-summary-sheet.tsx` (ไฟล์ใหม่)

Sheet เลื่อนจากขวา (`components/ui/sheet.tsx`) แจกแจงครบทุกโมดูล:

- หัว Sheet: ขนาดรวม + จำนวนไฟล์
- แต่ละแถว: ชื่อโมดูล · ขนาด · แถบสัดส่วน · เปอร์เซ็นต์ · จำนวนไฟล์
- เรียงจากมากไปน้อย (ตามที่ backend ส่งมา)
- **แถบสัดส่วนใช้สีเดียวกันทุกแถว** ไม่ไล่สีต่อโมดูล — DESIGN.md ห้ามใช้สีสื่อความหมายแบบนั้น
  ความยาวแถบคือตัวสื่อสารสัดส่วน ส่วนตัวเลข % กำกับไว้เพื่อไม่ให้พึ่งสายตาอย่างเดียว
- ขนาดตัวอักษรใช้ token ตาม type-ladder ล้วน ห้ามใส่ค่าดิบ (`text-[10px]`) — มี guard test
  `components/ui/type-ladder.test.ts` สแกนทั้งรีโปและจะแดงถ้าหลุด

### 5.8 `routes/system-admin/document/document-component.tsx`

- เรียก `useDocumentSummary()`
- render `<DocumentSummaryBar>` คั่นระหว่างบล็อกหัวเรื่องกับแถวค้นหา (ในบล็อก sticky เดิม)
- ถือ state `summarySheetOpen` แล้ว render `<DocumentSummarySheet>`
- ค่า `max-h-[calc(...)]` ของ `DataGridContainer` (บรรทัด 278-283) ต้องบวกความสูงแถบสรุปเพิ่ม
  ไม่งั้นตารางจะล้นจอ — ปัจจุบันมี 2 เคสตามว่ามี active filter หรือไม่ จะกลายเป็น 4 เคส
  (มี/ไม่มีแถบสรุป × มี/ไม่มี filter)

## 6. สถานะต่าง ๆ

| สถานะ | พฤติกรรม |
|---|---|
| กำลังโหลด | skeleton สูงเท่าแถบจริง เพื่อไม่ให้เลย์เอาต์กระตุกตอนข้อมูลมาถึง |
| error ทั่วไป (500, network failure) | **ซ่อนแถบทั้งอัน** ตารางทำงานปกติ ไม่ขึ้น error state ไม่มี toast |
| **401 จาก allowlist ที่ยังไม่เติม** | **ไม่ได้ซ่อนแถบเงียบ ๆ — ผู้ใช้ถูกเด้งออกไปหน้า `/login` ทุกครั้งที่เปิดหน้านี้** ยืนยันด้วยการไล่โค้ดจริงแล้ว: `handleClientErrors` (`lib/http-client.ts:232`) เช็ค `isPermission = message?.toLowerCase().includes("permission")` แต่ข้อความจาก `AppIdGuard` ("...is not found or not allowed to access this api") ไม่มีคำว่า "permission" จึงหลุด branch permission ไปเข้า flow ปกติแทน: เรียก `refreshTokens()` ซึ่ง **สำเร็จ** (session ไม่ได้มีปัญหาจริง) → retry คำขอเดิม → ได้ 401 ซ้ำ → รอบนี้เป็น `isRetry` แล้ว จึง `tokenStore.clear()` → `RequireAuth` เด้งไป `/login` ทันที `retry: false` ของ query ไม่ช่วยอะไรเพราะการ logout เกิดใน `httpClient` ซึ่งอยู่คนละชั้นกับ TanStack Query **ข้อยกเว้น (ยังไม่ยืนยัน):** ถ้า application row ของ environment นั้นตั้ง `allow_all: true` ไว้ `AppAllowlistStore` จะ short-circuit ผ่านและไม่เกิด 401 นี้เลย — แต่ไม่มีใครตรวจว่า dev/UAT/prod ตั้งค่านี้จริงหรือไม่ (ต้อง query ฐานข้อมูลที่ใช้ร่วมกัน) ดังนั้นเป็นสถานะที่ **ไม่ทราบ** ไม่ใช่ข้อเท็จจริงไปทางใดทางหนึ่ง |
| BU ไม่มีไฟล์เลย (`total_count === 0`) | ไม่แสดงแถบ |
| `by_reference_type` มีรายการเดียว | แสดงตามปกติ (100%) |
| ยังไม่ได้เลือก BU | ไม่ยิง query (`enabled: !!buCode`) |

การซ่อนแบบเงียบเป็นการตัดสินใจโดยตั้งใจ **สำหรับ error ทั่วไปเท่านั้น** (500, network failure):
แถบสรุปเป็นข้อมูลเสริม ไม่ใช่ภารกิจหลักของหน้า การรับประกันนี้ **ไม่ครอบคลุม 401 จาก allowlist ที่
ยังไม่เติม** — กรณีนั้นผู้ใช้ถูกดีดออกจาก session จริง ไม่ใช่แค่แถบสรุปหายไปเฉย ๆ (ดูแถวด้านบนและ
ลำดับ deploy ข้อ 8) การแก้ `http-client.ts` ให้แยกแยะ 401 ประเภทนี้ออกจาก 401 ที่ควร clear session
จริง ๆ เป็นงานแยกที่กระทบทุก endpoint ที่มี guard แบบเดียวกัน จึงตั้งใจไม่ทำในรอบนี้

## 7. การตรวจสอบ

- `bunx tsc --noEmit` และ `bun run lint` ต้องสะอาด
- `bun test:run` ชุดที่มีอยู่ต้องเขียวทั้งหมด (`use-document-table` ที่ย้าย `formatFileSize` ออกไป
  เป็นจุดเสี่ยงที่สุด)
- ตรวจด้วยมือในเบราว์เซอร์กับ backend local (`VITE_DEV_PROXY_TARGET=http://localhost:4000 bun dev`):
  ยอดรวมตรงกับผลรวมจริงในฐานข้อมูล · เปิด/ปิด Sheet · สลับ BU แล้วยอดเปลี่ยนตาม ·
  อัปโหลดไฟล์แล้วยอดขยับ · ปิด backend แล้วแถบหายไปเงียบ ๆ โดยตารางยังทำงาน · ตรวจทั้ง th และ en

## 8. ลำดับ deploy

1. deploy `micro-file` และ `backend-gateway`
2. **เติม `documents.summary` ใน app allowlist ของทุก environment แล้วตรวจยืนยันก่อนเริ่ม deploy
   frontend — ขั้นนี้เป็น hard gate ห้ามข้าม** `AppIdGuard` (`app-id.guard.ts:70`, ข้อความ error จริง
   อยู่ที่ `app-id.guard.ts:81`) เช็ค `api_name` กับ allowlist ที่โหลดจากฐานข้อมูล ค่าที่ไม่มีในนั้นจะถูก
   ปฏิเสธด้วย 401 ทันที ขั้นตอนนี้ทำมือ เป็นขั้นเดียวกับที่เคยทำตอน interface-brands
   **ข้อยกเว้น (ยังไม่ยืนยัน):** ถ้า application row ของ environment นั้นตั้ง `allow_all: true` ไว้แล้ว
   `AppAllowlistStore` (`app-allowlist.store.ts`) จะ short-circuit ผ่านเลยโดยไม่เช็ค allowlist —
   ถ้าเป็นแบบนั้นจริง ขั้นนี้ไม่จำเป็นและปัญหาข้อ 3 ด้านล่างจะไม่เกิด แต่ **ไม่มีใครตรวจมาก่อนว่า
   dev/UAT/prod ตั้งค่านี้ไว้หรือไม่** (การตรวจต้อง query ฐานข้อมูลที่ใช้ร่วมกัน) จึงต้องตรวจให้แน่ใจ
   เป็นรายสภาพแวดล้อมก่อน ถ้ายังไม่ตรวจให้ถือว่าต้องเติม allowlist เสมอ
3. deploy frontend — **เริ่มได้ก็ต่อเมื่อข้อ 2 ยืนยันแล้วเท่านั้น**

พลาดลำดับหรือลืมข้อ 2 (ในสภาพแวดล้อมที่ไม่ได้ตั้ง `allow_all: true`) ผลที่ได้**ไม่ใช่แค่แถบสรุปไม่ขึ้น**
— ผู้ดูแลระบบที่เปิดหน้า `/system-admin/document` จะถูกเด้งออกไปหน้า `/login` ทุกครั้ง เพราะ 401 จาก
`AppIdGuard` ไม่มีคำว่า "permission" ในข้อความ ทำให้ `handleClientErrors` (`lib/http-client.ts:232`)
เข้าใจผิดว่าเป็นปัญหา session แล้วสั่ง `tokenStore.clear()` (รายละเอียดเต็มอยู่ใน §6)

## 9. ไฟล์ที่แตะ

**`carmen-turborepo-backend-v2`**

- `apps/micro-file/src/files/files.service.ts` — เพิ่ม `summarizeFiles`
- `apps/micro-file/src/files/files.controller.ts` — เพิ่ม `files.summary`
- `apps/backend-gateway/src/application/document-management/document-management.service.ts` — เพิ่ม `getDocumentSummary`
- `apps/backend-gateway/src/application/document-management/document-management.controller.ts` — เพิ่ม `GET .../summary` **ก่อน** `@Get(':filetoken')`
- `apps/backend-gateway/src/platform/applications/app-api-catalog.generated.ts` — regenerate

**`carmen-inventory-frontend-react`**

- `lib/format-file-size.ts` — ใหม่ (ย้ายมา + เพิ่ม GB/TB)
- `types/document.ts` — เพิ่ม type
- `constant/api-endpoints.ts` — เพิ่ม endpoint
- `hooks/use-document.ts` — เพิ่ม `useDocumentSummary`
- `routes/system-admin/document/document-reference-labels.ts` — ใหม่
- `routes/system-admin/document/document-summary-bar.tsx` — ใหม่
- `routes/system-admin/document/document-summary-sheet.tsx` — ใหม่
- `routes/system-admin/document/document-component.tsx` — เสียบเข้าหน้า + แก้ `max-h`
- `routes/system-admin/document/use-document-table.tsx` — import `formatFileSize` จากที่ใหม่
- `messages/en.json`, `messages/th.json` — key ใหม่ใต้ `systemAdmin.document.summary` และ `modules.*` อีก 8 ตัว
