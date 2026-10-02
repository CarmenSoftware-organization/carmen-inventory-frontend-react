# Accounting API integration checklist

ตรวจเมื่อ 2026-09-28 กับ [dev OpenAPI](https://dev.blueledgers.com:4001/swagger), BU `CARMEN-AVG` และ frontend ใน repo นี้; ทดสอบซ้ำกับ `CARMEN-FIFO` ตามตารางท้ายเอกสาร สถานะ `API` หมายถึงหน้าปัจจุบันเรียก backend จริง; `Mock` หมายถึงยังใช้ข้อมูลหรือ state จำลอง; `Available` หมายถึง backend มี endpoint แต่ยังต่อหน้าไม่ครบ ห้ามตีความว่า production ready

| ส่วนของ UI | สถานะปัจจุบัน | API ที่พบ / ผลตรวจ | สิ่งที่ต้องครบก่อนเปลี่ยน mock |
| --- | --- | --- | --- |
| Config → Chart of Accounts | API | `GET/POST /api/config/{bu_code}/chart-of-accounts` และ detail/update/delete; `GET` ของ BU นี้ตอบ `200` ข้อมูล 0 รายการ; `routes/config/chart-of-accounts/use-coa.ts` ใช้ `httpClient` แล้ว | ตรวจข้อมูล master ของ BU ก่อนใช้ใน JV/AP |
| Config → Currency, Cost Center และ master config อื่นที่มี hook จริง | API ตามแต่ละหน้า | OpenAPI มี `currencies`, `cost-centers`, `bank-accounts`, `gl-account-groups` | ตรวจเป็นรายหน้าเมื่อต้องใช้เป็น picker ใน Accounting |
| GL → Journal Voucher list/detail/create/workflow | Mock; backend available แต่ถูกปิดสิทธิ์ | `/api/{bu_code}/gl-jv` มี CRUD, submit/approve/reject; ทดสอบ `GET` ได้ `403 This feature is not included in your subscription` | assign license feature ให้ BU; ทำ adapter ตาม `GlJv*Dto` จริง (`prefix_id`, `jv_date`, `details`) และ map response; reconcile action ที่ UI มีแต่ API ไม่มี (`return-to-draft`, `retry-post`, `reschedule`) ก่อนสลับ |
| GL → Posting, reversal | Mock UI | `/api/{bu_code}/gl-posting/{id}/post|void|reverse` มีใน OpenAPI | ตรวจสิทธิ์, response, lifecycle และ idempotency ผ่านรายการจริง |
| AP → Invoice list/detail/draft/workflow | Mock; backend available | `/api/{bu_code}/ap-invoice` และ detail, from-GRN, submit/approve/review/reject/void; `GET` ตอบ `200` ข้อมูล 0 รายการ | adapter สำหรับ wire DTO: API ใช้ `doc_no`, `doc_status`, `doc_date`, `details`; UI ใช้ `ap_no`, `lifecycle`, `input_date`, `lines` และ field เพิ่มหลายชุด ต้องตรวจ detail snapshot/validation ด้วยข้อมูลจริง; `return` ของ UI ต้อง map กับ `review` ตาม semantics |
| AP → Payment list/detail/draft/workflow | Mock; backend available | `/api/{bu_code}/ap-payment` และ detail, outstanding-documents, wht-preview, submit/approve/review/reject/void; `GET` ตอบ `200` ข้อมูล 0 รายการ | adapter สำหรับ allocations/WHT/expenses และ response; ตรวจ state, open-item reservation, approval queue และ `clarify` ที่ UI มีแต่ API ไม่พบ; อย่าให้ปุ่มจำลองอ้างว่ามี bank execution จริง |
| AP → Dashboard, approval queue | Mock | ไม่พบ AP dashboard/approval-summary endpoint เฉพาะ; list API มี แต่ข้อมูล BU ว่าง | read model/aggregate, freshness, permission และ filter ตาม AP readiness doc |
| AR → Invoice/Receipt | Mock | ไม่พบ `/ar-*` API ใน OpenAPI นี้ | backend contract และ adapter |
| Asset → Register/Disposal | Mock | ไม่พบ asset transaction API ใน OpenAPI นี้ | backend contract และ adapter |
| Accounting dashboard/cash forecast | Mock | ไม่พบ aggregate/forecast API | canonical read model และ forecast assumptions |
| Template/Recurring Voucher | Mock | `/api/{bu_code}/gl-jv-templates` มี CRUD/generate; UI generic document mock ยังไม่ตรง DTO | แยก template/recurring model, map contract และทดสอบ lifecycle |
| Financial Reports | Mock | `/api/{bu_code}/gl-reports/trial-balance` มีเฉพาะ Trial Balance ใน OpenAPI | ใช้กับหน้า Trial Balance ที่ออกแบบให้ตรงสัญญา; generic reports เดิมยังสลับไม่ได้ |
| Allocation Voucher และ generic document pages | Mock | ไม่พบ endpoint ตรงชนิด | backend contract ตามเอกสาร functional design |

## ข้อสรุปการสลับข้อมูล

- ยังไม่มีหน้า Accounting mock ใดที่สลับเป็น API ได้ **ครบ flow** โดยเปลี่ยน URL อย่างเดียว เพราะ UI model/คำสั่ง workflow ต่างจาก wire contract; JV ยังติด license 403 ด้วย การสลับเฉพาะ read แล้วปล่อย write เป็น mock จะทำให้ผู้ใช้เห็นข้อมูลไม่ตรงกัน จึงยังไม่เปลี่ยน repository ในรอบตรวจนี้
- API ที่ใช้จริงอยู่แล้วคือ master config บางหน้า เช่น Chart of Accounts; การมี endpoint ใน Swagger เพียงอย่างเดียวไม่เปลี่ยนสถานะหน้า Accounting เป็น `API`
- ขั้นต่อไปที่คุ้มสุด: เปิด license GL สำหรับ BU นี้; ใส่ข้อมูลทดสอบ AP แบบควบคุม; ทำ HTTP adapter ของ AP Invoice หนึ่ง flow (list → detail → create/update → submit) พร้อม contract/smoke test แล้วจึงเปลี่ยนสถานะใน checklist นี้

## ผลทดสอบเพิ่มเติม: CARMEN-FIFO

ใช้บัญชีเดิมเรียก read-only endpoints เมื่อ 2026-09-28 (login `200`):

| Endpoint | ผล |
| --- | --- |
| `GET /api/CARMEN-FIFO/gl-jv` | `403` — feature ไม่อยู่ใน subscription |
| `GET /api/CARMEN-FIFO/ap-invoice` | `200` — 0 รายการ |
| `GET /api/CARMEN-FIFO/ap-payment` | `200` — 0 รายการ |
| `GET /api/config/CARMEN-FIFO/chart-of-accounts` | `200` — 0 รายการก่อนทดสอบ CRUD |
| `GET /api/config/CARMEN-FIFO/gl-jv-prefixes` | `403` — feature ไม่อยู่ใน subscription |
| `GET /api/config/CARMEN-FIFO/gl-periods` | `403` — feature ไม่อยู่ใน subscription |
| `GET /api/CARMEN-FIFO/gl-reports/trial-balance` | `403` — feature ไม่อยู่ใน subscription |

ดังนั้นการเปลี่ยน BU เป็น `CARMEN-FIFO` ยังไม่ปลดล็อกการสลับ mock; GL ยังถูก license gate และ AP ยังไม่มีข้อมูลสำหรับทดสอบ end-to-end

### Chart of Accounts CRUD smoke test

บน `CARMEN-FIFO` สร้างบัญชีชั่วคราวแบบ inactive (`category=asset`, `use_in=[gl]`) ได้ `201`; GET detail ได้ `200` พร้อม `doc_version=0`; PATCH description ได้ `200` และ version เพิ่มเป็น 1; DELETE ได้ `200`; GET detail หลังลบได้ `404` รายการทดสอบถูกลบแล้ว ไม่มีข้อมูลทดสอบค้างใน BU นี้

OpenAPI บังคับ `category` ตอน create แต่ฟอร์ม frontend เดิมไม่ส่ง จึงเพิ่ม category ใน form/schema/payload เพื่อให้ CRUD จากหน้าเว็บตรง contract ที่ทดสอบแล้ว

อ้างอิง semantics: [GL readiness](specs/general-ledger-implementation-readiness.md), [AP readiness](specs/accounts-payable-implementation-readiness.md). ไม่เก็บ credential หรือ token ใน repo
