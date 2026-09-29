# GRN: แก้หัวใบหลัง commit ได้ จนกว่าจะถูกดึงเข้า AP Invoice

วันที่ 2026-09-29 · รีโป: `carmen-turborepo-backend-v2` + `carmen-inventory-frontend-react`

## 1. เป้าหมาย

ใบ GRN ที่ `committed` แล้วต้องแก้ข้อมูลหัวใบได้ 6 ช่อง เพื่อตามแก้ข้อมูลที่ได้จากใบแจ้งหนี้
ของผู้ขาย โดยไม่ต้องย้อนทำใบใหม่

- ② Post Type (`post_type`)
- ③ Credit Term (`credit_term_id` / `credit_term_name` / `credit_term_days`)
- ④ Invoice No. (`invoice_no`)
- ⑤ Invoice Date (`invoice_date`)
- ⑥ Due Date (`payment_due_date`)
- ⑦ Description (`description`)

**แก้ไม่ได้** เมื่อใบ `voided` หรือ**มี AP Invoice ที่ยังไม่ void ดึงใบนี้ไปแล้ว**
(AP Invoice ใช้เลข/วันที่ใบแจ้งหนี้, credit term และ due date ชุดเดียวกับ GRN — แก้ GRN
หลังจากนั้นจะทำให้สองเอกสารพูดไม่ตรงกัน)

**ล็อกเสมอบนใบ committed:** Vendor, GRN Date, ① Currency / Exchange rate, รายการสินค้า,
extra cost — ใบ committed ถูกลงสต๊อกด้วยต้นทุนสกุลหลักแล้ว และ `repostGrnLedgerIfChanged`
จงใจไม่ลงใหม่ให้ใบที่ตัดยอด PO แล้ว การเปลี่ยนเรตหรือจำนวนจะทำให้เอกสารกับต้นทุนสต๊อก
แยกทางกันเงียบ ๆ (ถ้าเรตผิดจริง ทางที่ถูกคือ Credit Note / ใบปรับต้นทุน)

นอกขอบเขต: ใบ `saved` (ทำแล้วใน commit `aad1136b` — แก้ได้ทุกช่องยกเว้น Vendor กับ GRN Date),
ใบ draft (ไม่เปลี่ยน)

## 2. Backend

### 2.1 ส่งสถานะ AP กลับไปกับ GRN

`GoodReceivedNoteService.findOne` (micro-business) เพิ่มฟิลด์

```ts
ap_invoices: { id: string; doc_no: string; doc_status: enum_ap_invoice_status }[]
```

หาจาก `tb_ap_invoice_detail_source.good_received_note_id = grn.id`
→ `tb_ap_invoice_detail` → `tb_ap_invoice` โดยตัดใบที่ `doc_status = void` หรือ
`deleted_at IS NOT NULL` ออก และ distinct ตาม ap invoice id (ใบ AP หนึ่งใบดึงหลายบรรทัด
ของ GRN เดียวกันได้) ไม่มี = `[]`

ต้องเพิ่มฟิลด์นี้ใน **ทั้งสอง** response schema ไม่งั้น gateway ตัดทิ้งเงียบ ๆ:
- `apps/micro-business/src/inventory/good-received-note/dto/good-received-note.serializer.ts`
  (`GoodReceivedNoteDetailResponseSchema`)
- `apps/backend-gateway/src/common/dto/good-received-note/good-received-note.serializer.ts`
  (`GoodReceivedNoteDetailResponseSchema`)

list endpoint ไม่เปลี่ยน

### 2.2 ด่านใน `update()`

`update()` ตอนนี้ไม่เช็คสถานะใบเลย เพิ่มด่านหลังโหลดใบ ก่อน validate header:

| สถานะใบปัจจุบัน | เงื่อนไข | ผล |
|---|---|---|
| `voided` | — | ปฏิเสธ `GRN_VOIDED_NOT_EDITABLE` |
| `committed` | มี AP Invoice (นิยามเดียวกับ 2.1) | ปฏิเสธ `GRN_AP_LINKED_NOT_EDITABLE` (ใส่เลข AP ในข้อความ) |
| `committed` | payload มี key นอก allowlist | ปฏิเสธ `GRN_COMMITTED_HEADER_ONLY` (ใส่ชื่อ key ในข้อความ) |
| `committed` | อื่น ๆ | ทำงานตามเดิม |
| `draft` / `saved` | — | ไม่เปลี่ยน |

allowlist ของใบ committed: `id`, `doc_version`, `post_type`, `credit_term_id`,
`credit_term_name`, `credit_term_days`, `invoice_no`, `invoice_date`, `payment_due_date`,
`description` — เช็คจาก key ที่ **มีค่า (ไม่ใช่ undefined)** ใน payload หลังลบ
`received_by_*` ออกแล้ว

error code สามตัวใหม่เพิ่มใน `packages/error-catalog/src/catalog.ts` — package นี้มี `dist/`
ที่ถูกอ่านจริง ต้อง build ใหม่ก่อน micro-business / gateway จะเห็น

### 2.3 สิ่งที่จงใจไม่ทำ

- ไม่แตะ `repostGrnLedgerIfChanged` — ใบ committed ไม่มี key ที่กระทบ ledger ผ่านด่านได้อยู่แล้ว
- ไม่กันฝั่ง AP (สร้าง AP Invoice จาก GRN) — การแก้หัวใบเกิดก่อนเสมอ

## 3. Frontend

### 3.1 Type

`types/goods-receive-note.ts` → `GoodsReceiveNote` เพิ่ม
`ap_invoices?: { id: string; doc_no: string; doc_status: string }[]` (optional — backend
เก่ายังไม่ส่ง)

### 3.2 `grn-header.tsx`

- `apLocked = isCommitted && (goodsReceiveNote?.ap_invoices?.length ?? 0) > 0`
- `canEdit = !isVoid && !apLocked` — ใบ committed ที่ไม่ติด AP มีปุ่ม Edit
- ใบที่ `apLocked`: แสดงปุ่ม Edit **แบบกดไม่ได้** พร้อม tooltip
  "ถูกดึงไปที่ AP Invoice {docNo} แล้ว — แก้ไขไม่ได้" (หลายใบ = คั่นด้วย ", ") ข้อความผ่าน
  i18n (`messages/{en,th}.json`, namespace `procurement.goodsReceiveNote`) — ห้ามมี `{{}}`
- โหมดแก้ของใบ committed: Cancel / Save เท่านั้น — ไม่มี Save draft, ไม่มี Delete
  (หลังบ้านลบได้เฉพาะร่างอยู่แล้ว)

### 3.3 ปุ่ม Save ต้องส่งสถานะเดิมของใบ

`grn-form.tsx` ตอนนี้ผูก `onSave={() => handleSubmitWithStatus("saved")}` ตายตัว — กับใบ
committed จะทำให้ `doc_status` ถูกนับเป็นค่าที่เปลี่ยนแล้วส่งไป (หลังบ้านปฏิเสธด้วย
`GRN_COMMITTED_HEADER_ONLY`) แก้เป็นส่ง `"committed"` เมื่อใบเป็น committed อยู่แล้ว
นอกนั้นคง `"saved"` · ใบ committed ไม่เข้าเงื่อนไข `willCallSave` (เฉพาะใบร่าง) จึงยิงแค่ PATCH

### 3.4 ล็อกช่องบนใบ committed

- `GrnFormHeader`: เพิ่ม prop `lockCommercial` (ใบ committed) → ล็อก Currency กับ Exchange
  rate เพิ่มจาก `lockIdentity` (Vendor / GRN Date) ที่มีอยู่แล้ว — ใบ committed ส่งทั้งสองตัว
- `GrnItemTable` / `GrnExtraCostFields`: `disabled` เป็นจริงเมื่อใบ committed แม้อยู่โหมดแก้

## 4. ลำดับ deploy

**Backend ก่อน FE** — ด่านจริงอยู่ที่ backend ถ้า FE ขึ้นก่อน ใบ committed จะกดแก้หัวใบได้
โดยไม่มีด่าน AP (FE เห็น `ap_invoices` เป็น undefined = ไม่ติด AP) ไม่มี migration

## 5. การตรวจ

ตามข้อตกลงของ user ไม่เขียนเทสต์ใหม่ — แต่เทสต์เดิมต้องผ่าน

- Backend: `bunx tsc --noEmit` ของ micro-business + gateway, jest ของ good-received-note
  ทั้งสองแอป (ห้าม `bun test`)
- curl ผ่าน gateway local (:4000 = dev DB ที่ใช้ร่วมกัน — ยิงเฉพาะใบทดสอบ):
  1. GET ใบ committed → มี `ap_invoices`
  2. PATCH ใบ committed ที่ไม่ติด AP แก้ `invoice_no` → 200
  3. PATCH ใบเดียวกันส่ง `exchange_rate` → 400 `GRN_COMMITTED_HEADER_ONLY`
  4. PATCH ใบ committed ที่ติด AP → 400 `GRN_AP_LINKED_NOT_EDITABLE`
  5. PATCH ใบ voided → 400 `GRN_VOIDED_NOT_EDITABLE`
- Frontend: `bun run typecheck`, `bun run lint`, `bun test:run routes/procurement/goods-receive-note`
  แล้วเปิดเบราว์เซอร์ดูใบ committed (ช่องที่ล็อก/เปิด, ปุ่ม, tooltip ใบที่ติด AP)
