# เปลี่ยน API contract จาก flat field เป็น object ทั้งระบบ

วันที่ 2026-09-17 · สถานะ: design รออนุมัติ · ครอบ 3 รีโป (carmen-turborepo-backend-v2,
carmen-inventory-frontend-react, carmen-inventory-mobile) + e2e

## ปัญหา

API ของระบบใช้สองแบบปนกันในการอ้างถึง entity อื่น โดยไม่มีกติกาว่าเมื่อไหร่ใช้แบบไหน

- **แบบ flat** — `vendor_id` + `vendor_name` แยกกันคนละคีย์ (PR, PO, GRN, SR, SI, SO)
- **แบบ object** — `vendor: { id, name }` (Credit Note, Price List, RFP)

นอกจากอ่านยากแล้ว ยังมีจุดที่ **ซ้ำในตัวเอง**: `GET /api/{bu}/purchase-orders/{id}`
ส่งทั้ง `vendor_id`/`vendor_name` **และ** `vendor: {id, name}` ที่มีค่าเดียวกัน

เป้าหมาย: **ให้ทุก endpoint อ้าง entity ด้วย object รูปแบบเดียวกันทั้งระบบ**

## ของเดิมที่เกี่ยวข้อง (สำรวจแล้ว ยิง API จริงบน :4000 BU=T02)

### สภาพปัจจุบันของแต่ละเอกสาร

| เอกสาร | รูปแบบวันนี้ |
|---|---|
| PO detail | flat **+** object (`vendor`, `currency` ซ้ำกัน) |
| PO list, PR, GRN, SI, SO | flat ล้วน |
| Credit Note, Price List, RFP | object ล้วน |
| Product | object (`inventory_unit`, category) ปนกับ flat (`tax_profile_*`) |
| SR | **ยังตรวจไม่ได้** — T02 ไม่มีข้อมูล ต้องหา BU ที่มี SR ก่อนเริ่ม |

### ขนาดงานที่วัดได้

| ฝั่ง | ขนาด |
|---|---|
| response (serializer ที่ gateway) | 85 reference group / 23 ไฟล์ |
| request (write DTO ที่ gateway) | 103 reference group / 44 ไฟล์ |
| frontend-react | 2,358 จุด / 297 ไฟล์ |
| mobile | 453 จุด / 36 ไฟล์ |
| e2e | 23 จุด / 8 ไฟล์ |

### กลไกที่มีอยู่แล้วและใช้ได้เลย

- **`ZodSerializerInterceptor`** (`app.module.ts:232`, global) รัน `schema.parse()` กับ
  **ทุก** response ที่ติด `@Serialize(...)` → schema คือจุดควบคุมรูปร่างขาออกจุดเดียว
- **`ZodValidationPipe` ของ `nestjs-zod`** (`app.module.ts:220`, global `APP_PIPE`)
  ตรวจเฉพาะ DTO ที่สร้างด้วย `createZodDto` (163 ไฟล์) → จุดควบคุมขาเข้า
- **micro-business อยู่หลัง RPC transport** (`@repo/nest-http-transport`) ไม่ใช่ปลายทาง
  สาธารณะ และ gateway forward `{ ...createDto }` เข้า service ตรง ๆ
  (`purchase-orders.controller.ts:688`)

### กับดักที่เจอระหว่างสำรวจ

- **`@ApiVersionMinRequest()` ไม่ใช่ระบบ versioning** — มันแค่เพิ่ม query param `version`
  ลง Swagger เฉย ๆ (`userfilter.decorator.ts:12-33`) ไม่มีผลต่อการทำงาน **อย่าเข้าใจผิดว่า
  มี versioning ให้ใช้อยู่แล้ว**
- **25 DTO เป็น plain class ที่ไม่ถูก validate เลย** — มีแต่ `@ApiProperty` ไว้ทำ Swagger
  body ผ่านฉลุย `PurchaseOrderCreateDto` คือหนึ่งในนั้น
- **gateway มีเทสต์แดงค้างบน main อยู่แล้ว ~15 suite** — ต้องเก็บ baseline ก่อน
- **mobile ไม่มี force-update และไม่มี expo-updates (OTA)** — แต่ยังไม่ live
  (`eas.json` production track เป็น `releaseStatus: "draft"`) จึง break ได้

## การตัดสินใจ

1. **เป้าหมายคือ contract สะอาดทั้งระบบ** ไม่ใช่ลดขนาด payload (object ทำให้ payload
   ใหญ่ขึ้นเล็กน้อย ยอมรับ)
2. **เปลี่ยนทั้ง request และ response** ไม่ใช่แค่ขาออก
3. **ทำทีเดียวทั้ง 85 + 103 group** ไม่แบ่งเฟส — รับความเสี่ยงหน้าต่าง deploy ไว้โดยรู้ตัว
4. **mobile break ได้** เพราะยังไม่ live
5. **ไม่แตะ DB** — ไม่มี migration

## กติกาการแปลง

### อะไรคือ entity reference (ต้องแปลง)

กลุ่มที่มี `<base>_id` **และ** อย่างน้อยอีกหนึ่งใน `_name` / `_code` / `_symbol`
→ ยุบเป็น `<base>: { id, name?, code?, symbol? }` **เอาเฉพาะคีย์ที่มีอยู่จริง ไม่เพิ่มคีย์ใหม่**

```
// ก่อน
product_id: "00b9...", product_name: "Dried Roselle", product_code: "11140012"
vendor_id: "020e...", vendor_name: "Daew"

// หลัง
product: { id: "00b9...", name: "Dried Roselle", code: "11140012" }
vendor:  { id: "020e...", name: "Daew" }
```

**เหตุผลที่ไม่เพิ่มคีย์:** การเติม `code` ให้ครบทุกตัวต้อง join เพิ่มใน DB = กระทบ
performance และทำให้ diff ตรวจไม่ได้ว่าค่าตรงกับของเดิม

### อะไรไม่ใช่ (ห้ามแตะ)

ฟิลด์ที่ลงท้ายคล้ายกันแต่ไม่ได้อ้าง entity อื่น — `po_no`, `pr_no`, `grn_no`,
`invoice_no`, `tax_invoice_no`, `sequence_no`, `doc_version` และพวก `_rate` / `_amount` /
`_qty` ทั้งหมด กติกา "ต้องมี `_id` คู่" คัดออกได้เองโดยอัตโนมัติ ที่เหลือใส่ allowlist

### สามเคสที่ตัดสินไว้แล้ว

1. **`product_local_name`** เป็นชื่อที่สองของ product ตัวเดียวกัน ไม่ใช่ entity คนละตัว
   → ยุบเข้าด้วยกันเป็น `product: { id, name, local_name, code }`
2. **`_id` ที่ไม่มีคู่** (เช่น `tax_profile_id` ที่มากับ `tax_profile_name: null`)
   → **ยังแปลงเป็น object** `tax_profile: { id, name }` เพื่อให้ contract สม่ำเสมอ
3. **ค่าว่าง:** ถ้า `<base>_id` เป็น `null` → ส่ง `<base>: null`
   **ไม่ใช่ `{}` และไม่ใช่ `{ id: null, name: null }`**
   (ของเดิมที่ PO ทำอยู่ส่ง `{}` ซึ่งทำให้ FE แยกไม่ออกว่า "ไม่มีค่า" กับ "โหลดไม่ได้")
   ฝั่ง FE อ่านด้วย `po.credit_term?.name ?? "—"`

## สถาปัตยกรรม — มีจุดแปลงแค่ 2 จุด

### ขาออก (response)

ใส่การแปลงไว้ **ในตัว zod schema เอง** ไม่ต้องไล่แก้ mapping ใน service

```ts
// helper ตัวเดียว ใช้กับทั้ง 85 group
vendor:  entityRef(["id", "name"]),
product: entityRef(["id", "name", "local_name", "code"]),
```

`entityRef()` เป็น preprocess ที่อ่าน `<base>_*` จาก object ดิบ ยุบเป็น object แล้วลบคีย์
flat ทิ้ง — `ZodSerializerInterceptor` เรียก `schema.parse()` อยู่แล้วจึงทำงานอัตโนมัติ

### ขาเข้า (request)

ใส่ `.transform()` ที่ schema ฝั่งเข้า **คลี่ object กลับเป็น flat ก่อนส่งต่อ**
micro-business จึงได้ payload หน้าตาเดิมเป๊ะ

### ผลที่ตามมา — micro-business ไม่ต้องแก้แม้แต่บรรทัดเดียว

service, Prisma, DB ไม่ขยับ ตัวเลข 10,436 จุดฝั่ง backend เกือบทั้งหมดไม่ต้องแตะ
เหลือ ~23 serializer + ~44 DTO ที่ gateway และเป็นการแก้แบบ **ประกาศรายการ**
ไม่ใช่เขียน mapping มือ

> **เส้นตรวจสอบตัวเอง:** ถ้าระหว่างทำพบว่าต้องไปแก้เทสต์หรือโค้ดของ micro-business
> แปลว่าหลุดไปแก้ผิดชั้น ให้หยุดแล้วย้อนดู — micro-business ต้องยังเป็น flat ล้วน

### ข้อควรระวังฝั่ง request

`PurchaseOrderCreateDto` และอีก 24 ไฟล์เป็น plain class ที่ **ไม่ถูก validate เลยวันนี้**
การย้ายไปใช้ `createZodDto` เท่ากับเพิ่มการตรวจที่ไม่เคยมี → payload ที่วันนี้ส่งอะไรเกินมา
แล้วผ่าน จะเริ่มโดน reject

**วิธีรับมือ:** แยกเป็นขั้นของตัวเองใน plan และให้ schema เริ่มจาก `passthrough` ก่อน
ไม่งั้นจะ debug ไม่ออกว่าพังเพราะ object-conversion หรือเพราะ validation ใหม่

## ฝั่ง client — ให้คอมไพเลอร์ชี้ทาง

2,358 + 453 จุดไม่มีทางลัด แต่ไม่ต้อง grep: แก้ type ก่อน (`types/purchase-order.ts` ฯลฯ)
แล้ว `bunx tsc --noEmit` จะชี้ทุกจุดที่พังให้เอง = รายการงานที่คอมไพเลอร์ผลิตให้
mobile ก็มี type ครอบอยู่แล้ว (`src/lib/api/purchase-orders.ts`) ใช้วิธีเดียวกัน

## แผนพิสูจน์ความครบและการตรวจ

### 1. Golden snapshot — ขั้นแรกสุด ก่อนแตะโค้ดแม้แต่บรรทัดเดียว

ความเสี่ยงจริงของงานนี้ไม่ใช่ "คอมไพล์ไม่ผ่าน" (tsc จับให้) แต่คือ **ข้อมูลหายเงียบ ๆ**

ดัมพ์ response ของทุก endpoint ที่มีข้อมูลใน T02 เก็บเป็น baseline → หลังแปลงยิงซ้ำ →
เทียบแบบ normalize (คลี่ object กลับเป็น flat แล้ว diff) ต้องเหมือนกันเป๊ะทุกค่า

**ถ้าลืมทำขั้นนี้แล้วแก้โค้ดไปแล้ว จะกู้ baseline ไม่ได้อีก**

### 2. สคริปต์พิสูจน์ความครบ (2 ตัว)

- **สแกนโค้ด** — ไล่ทุก serializer/DTO ที่ gateway fail ถ้าเจอ `<base>_id` ที่ยังไม่ถูกยุบ
  และไม่อยู่ใน allowlist → ตอบ "ครบ 188 group แล้วยัง" ได้ในคำสั่งเดียว
  และกันของใหม่ที่เผลอเขียนเป็น flat ในอนาคต
- **ยิงของจริง** — ยิงทุก endpoint ใน T02 ยืนยันว่าไม่มีคีย์ flat หลงเหลือ

ทำเป็น **สคริปต์ใน `scripts/`** ไม่ใช่ `.spec.ts` (ตามแนวทางที่ตกลงกันว่าไม่เขียนเทสต์
ระหว่างรันแผน) รันด้วยมือได้ทันที และเสียบเข้า CI ทีหลังได้

### 3. เทสต์ที่มีอยู่

| | ไฟล์ที่อ้าง flat | ต้องแก้ |
|---|---|---|
| micro-business | 144 | **0** |
| gateway (serializer/dto spec) | 11 | 11 |
| gateway (controller/service spec) | 75 | ต้องไล่ดู — ส่วนใหญ่ mock ฝั่ง micro ซึ่งยัง flat |
| frontend-react | 43 | ตามที่ tsc ชี้ |
| e2e | 6 | 6 |

**ก่อนเริ่ม: เก็บรายชื่อ suite ที่แดงอยู่เดิมบน main ไว้** ไม่งั้นแยกไม่ออกว่าอันไหนเราทำพัง

### 4. ตรวจด้วยมือ

**ต้องกด Save จริงทุกเอกสาร ไม่ใช่แค่เปิดดู** — รอบนี้ขาเข้าเปลี่ยนด้วย ถ้าดูแค่หน้า
list/detail จะไม่รู้ว่าการเขียนพัง จนกว่าจะมีคนสร้างเอกสารจริงแล้วข้อมูลหาย

- **เบราว์เซอร์:** PR / PO / GRN / SR / SI / SO — list → detail → **สร้างใหม่ + Save** →
  **แก้แล้ว Save ซ้ำ** → เปิดกลับมาดูว่า vendor / สินค้า / location ยังครบ
- **เพ่งเป็นพิเศษ:** PO สร้างจาก PR และ GRN สร้างจาก PO — เป็นเส้นที่ส่ง reference
  ข้ามเอกสาร ถ้าการคลี่ object→flat ผิด จะพังตรงนี้ก่อนที่อื่น
- **mobile:** internal build ตรวจ po-list, po-detail, receiving

## ลำดับ deploy และความเสี่ยงที่รับไว้

เพราะ break ทั้งขาเข้าและขาออกพร้อมกัน **จึงไม่มีช่วง overlap ให้ค่อย ๆ ย้าย**

1. merge ครบทั้ง 3 รีโปก่อน **ยังไม่ deploy อะไรเลย**
2. deploy gateway → **deploy FE ทันทีติด ๆ กัน**
3. ปล่อย mobile internal build ตามหลังได้ (ยังไม่ live)
4. **rollback = revert โค้ด gateway อย่างเดียว** ไม่มี migration ไม่ต้องกู้ข้อมูล

> **ความเสี่ยงที่รับไว้โดยรู้ตัว:** ช่วงระหว่างข้อ 2 (gateway ขึ้นแล้ว แต่ FE ยังไม่ขึ้น)
> ระบบจะพัง ต้องนัดเวลาไว้ล่วงหน้าและทำให้หน้าต่างนี้สั้นที่สุด นี่คือราคาของการเลือก
> big-bang แทนการทำเป็นเฟส ซึ่งเป็นการตัดสินใจที่ยืนยันแล้ว

## ของที่ยังค้าง ต้องเคลียร์ก่อนเริ่ม

- **หา BU ที่มีข้อมูล SR** — T02 ไม่มี จึงยังไม่เคยเห็นรูป response จริงของ SR
  (serializer บอกว่ามี 9 reference group) ถ้าไม่มี BU ไหนมีเลย ต้องสร้างเอกสารทดสอบก่อน
  ไม่งั้น golden snapshot จะไม่ครอบ SR
- **ยืนยันว่า 75 gateway spec ที่เหลือมีกี่ไฟล์ที่ assert รูป response จริง**
  (ที่เหลือแค่ mock ฝั่ง micro ซึ่งยัง flat จึงไม่ต้องแก้)
