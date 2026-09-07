# Accounts Payable — Module Design

## 1. เป้าหมาย

สร้าง Accounts Payable (AP) บน Accounting Foundation ให้ครอบคลุมวงจรเจ้าหนี้ตั้งแต่รับ Invoice, ตรวจ PO/GRN, บันทึกภาษีและหนี้, เตรียม Payment, อนุมัติ, จ่ายเงินจริง, ส่งรายการเข้า GL และติดตามยอดคงค้าง/Aging โดย reuse master data, Workflow, Running Code, Currency, Exchange Rate, Period, Attachment, Activity Log และ posting contract เดียวกับ General Ledger

เอกสารชุดนี้เป็น functional design จาก mockup ที่ได้รับเพิ่มเติม ยังไม่ใช่ implementation plan, schema migration หรือ API contract ฉบับสุดท้าย

เอกสารรายละเอียด:

- [AP Dashboard](accounts-payable-dashboard-design.md)
- [AP Invoice](accounts-payable-invoice-design.md)
- [AP Payment](accounts-payable-payment-design.md)
- [General Ledger — Journal Voucher](general-ledger-journal-voucher-design.md)
- [Accounting Foundation](../accounting-foundation.md)

## 2. Reference UI ที่ตรวจแล้ว

ตรวจไฟล์ทั้งหมดใน `docs/accounting/ui-specs/` เมื่อ 2026-09-01:

| File | สิ่งที่ใช้เป็น reference |
| --- | --- |
| `hotel_ap_erp_mockup_v4_4_3.html` | AP dashboard, PO/deposit entry point, document directory, invoice form, tax, references, payment history, GL preview, budget, dimensions, attachments และ audit log |
| `hotel_ap_erp_Invoice_mockup_v4_4_8.html` | Invoice form รุ่นล่าสุด โดยรวม Tax 1/Tax 2 เป็น Tax summary, แสดง unpaid amount, เพิ่ม override controls และย้าย totals ให้เห็นทุก tab |
| `hotel_ap_erp_Aging_Dashboard_mockup_v4_4_4.html` | Aging/due-date/tax/approval dashboard และการสร้าง payment settlement แบบ group ตาม currency และ vendor พร้อม WHT/FX |
| `carmen_cloud_ap_payment_approval_mockup.html` | Payment approval queue, urgent filter, batch approval, invoice/PO/GRN evidence, GL preview, bank/cheque detail, request clarification, reject และ approval audit |

ลำดับความสำคัญเมื่อ mockup ขัดกัน:

1. Accounting Foundation และกฎบัญชี/ภาษีที่ backend บังคับ
2. Invoice mockup v4.4.8 สำหรับ invoice interaction ล่าสุด
3. Aging Dashboard v4.4.4 สำหรับ payment preparation
4. Payment Approval mockup สำหรับ approver experience
5. v4.4.3 ใช้เติม flow ที่รุ่นใหม่ไม่ได้แสดง

Mockup เป็น feature และ UX reference เท่านั้น ตัวเลข, account code, USALI mapping, WHT rate, AI score, ขั้นอนุมัติ และสูตร JavaScript ใน mockup ไม่ใช่ canonical business rule

## 3. Phase 1 scope

### Must have

- AP Invoice directory และ create/view/edit draft
- Standard Invoice ทั้ง PO-based และ non-PO พร้อม duplicate check
- Invoice line, discount, input VAT, WHT eligibility, department และ data-driven dimensions
- PO/GRN match result และ exception acknowledgement ตาม tolerance policy
- Save Draft, Submit, optional Workflow และ post AP liability ผ่าน Accounting posting contract
- Open amount, partial settlement และ paid state
- Payment proposal จาก invoice ที่มีสิทธิ์จ่าย โดย group ตาม BU, vendor และ payment currency
- Payment Voucher (PV), invoice application, WHT, bank/payment method และ FX realization
- Save Draft, Submit, optional Workflow, release/execute และ post payment แบบ idempotent
- Payment approval queue พร้อม Approve, Return/Request Clarification และ Reject ตาม Workflow
- Invoice/Payment Activity Log, optimistic concurrency ด้วย `doc_version` และ source-to-JV trace
- AP Aging และ due-date summary จาก posted open items
- Thai/English, BU timezone, date/number format และ currency precision

### Optional เมื่อ shared capability พร้อม

- Attachments และ document preview
- AI OCR invoice extraction โดยต้องให้ผู้ใช้ยืนยันก่อนบันทึก
- Budget check แบบ warning/acknowledgement/block ตาม BU policy
- Payment batch approval
- Cheque printing และ payment advice
- Input VAT/WHT register export

### Deferred

- Deposit request lifecycle แบบเต็ม
- Debit Note/Credit Note standalone management นอก use case ที่ต้องใช้ปรับ Invoice
- Bank file generation, host-to-host submission และ automatic bank reconciliation
- Recurring invoice, supplier portal และ e-invoice ingestion
- AI approval/recommendation ที่ทำ action แทนผู้ใช้
- Cash forecasting และ dynamic discounting

## 4. Information architecture

Routes ที่เสนอ:

```text
/accounting/accounts-payable
/accounting/accounts-payable/invoices
/accounting/accounts-payable/invoices/new
/accounting/accounts-payable/invoices/:id
/accounting/accounts-payable/invoices/:id/edit
/accounting/accounts-payable/payments
/accounting/accounts-payable/payments/new
/accounting/accounts-payable/payments/:id
/accounting/accounts-payable/payments/:id/edit
/accounting/accounts-payable/payment-approvals
```

Dashboard เป็น landing page ของ AP ส่วน Aging, due-date, approval และ tax cards ต้องเปิด directory พร้อม filter context ที่สอดคล้องกัน ไม่สร้างยอด summary คนละนิยามกับ list

Route ต้องอยู่ใต้ `ProtectedShell` และมี section-level `RouteErrorBoundaryAdapter` ตาม convention ของ repository

## 5. Shared domain boundaries

### Reuse/extend

| Capability | Decision |
| --- | --- |
| BU, auth และ permission | reuse; ทุก record และ API ต้องบังคับ BU scope ฝั่ง backend |
| Vendor | reuse vendor master; snapshot code, legal name, tax ID, branch, payment term และ payment instruction ที่ใช้กับเอกสาร |
| Currency/Exchange Rate | reuse/extend ตาม Foundation; เก็บ booking-rate และ settlement-rate snapshot แยกกัน |
| Department/Dimensions | reuse department และใช้ data-driven dimension definitions ห้าม hardcode `dim1..dim7` |
| Tax Profile | extend ให้มี VAT/WHT behavior, account mapping, effective dates, filing data และ override permission |
| Workflow | optional ต่อ BU + AP document type/payment type; snapshot definition ตอน Submit |
| Running Code | extend sequence ต่อ BU + document type + fiscal policy เช่น `IV`, `CN`, `DN`, `DP`, `PV` |
| Attachments | verify/reuse shared file service พร้อม permission, malware/content validation และ retention |
| Posting | AP ส่ง immutable source payload/version เข้า Journal Staging/posting contract; ห้ามเขียน ledger โดยตรง |

### AP-owned records

- AP document header/lines และ source reference
- Match result/tolerance exception snapshot
- AP open item และ applications
- Payment Voucher, payment application และ disbursement instruction
- Input VAT/WHT document detail และ filing linkage
- Vendor/account/payment snapshots ที่จำเป็นต่อ audit
- Workflow/posting/execution references และ Activity Log

## 6. Status model

ห้ามใช้ status เดียวแทนทุกความหมาย เช่น `Effective` หรือ `Approved` ต้องแยกอย่างน้อย 5 แกน:

| Axis | ตัวอย่างค่า |
| --- | --- |
| Document lifecycle | `draft`, `submitted`, `posting`, `posted`, `post_failed`, `voided`, `reversed` |
| Workflow | disabled หรือ workflow instance/stage/outcome |
| Settlement | `unpaid`, `partially_paid`, `paid` |
| Tax | `pending`, `confirmed`, `on_review`, `filed`, `unclaimable`, `not_applicable` |
| Bank execution | `not_released`, `released`, `processing`, `executed`, `failed`, `cancelled`, `reconciled` |

Directory อาจแสดง badge แบบ composite แต่ API และ domain model ต้องเก็บแต่ละแกนแยกกัน

## 7. End-to-end flow

```text
Vendor invoice / PO / GRN
  -> AP Invoice draft
  -> validate + match + optional approval
  -> post invoice liability through Accounting posting contract
  -> AP open item
  -> payment proposal groups eligible open items
  -> Payment Voucher draft
  -> optional approval
  -> release/execute payment
  -> post AP clearing, WHT, bank and FX
  -> apply open items
  -> paid/partially paid + bank reconciliation
```

กติกาสำคัญ:

- การอนุมัติไม่เท่ากับการ post และไม่เท่ากับธนาคารจ่ายสำเร็จ
- Invoice ที่ post แล้วแก้ยอด/บัญชีไม่ได้ ต้องทำ Credit Note, Debit Note หรือ reversal ตามกรณี
- Payment application และ ledger posting ต้อง commit ใน transaction boundary เดียวกันเมื่อ policy กำหนดให้ post ตอน execute
- Retry ทุก action ที่สร้างเลขเอกสาร, ledger, WHT certificate หรือ bank instruction ต้อง idempotent
- Source document และ generated JV ต้องเปิดดูข้ามกันได้ แต่ generated JV จาก AP เป็น read-only projection

## 8. Dashboard and Aging

รายละเอียด implementation-ready อยู่ใน [AP Dashboard Design](accounts-payable-dashboard-design.md)

### KPI/reference cards

- Total AP Outstanding
- Prepaid/Deposit balance โดยแยก asset balance ออกจาก AP liability
- Total Paid Out สำหรับช่วงวันที่ที่ผู้ใช้เลือก
- Aging buckets: Current/Not Yet Due, 1–30, 31–60, 61–90, Over 90
- Due Today และ Overdue
- Pending approvals แยก Invoice, Deposit, Credit Note, Debit Note และ Payment
- Pending input VAT, tax documents approaching claim deadline, missing tax invoices และ pending corrections

### Canonical definitions

- Aging ใช้ posted AP open item เท่านั้น ไม่รวม draft/submitted invoice
- Age คำนวณจาก `due_date` สำหรับ overdue view และจาก `document_date` หรือ `due_date` ตาม report policy ที่ระบุชัด
- ยอดแสดงใน functional currency; foreign-currency amount ต้องเปิด drill-down ดู transaction currency และ rate snapshot ได้
- Credit balance/credit note ต้องแสดงแยกหรือหักตาม report policy โดยห้ามซ่อน negative open item
- Dashboard total ต้อง reconcile กับ directory ภายใต้ BU, as-of date, currency และ filter เดียวกัน
- การคลิก card ส่ง filter context ไปยัง server-side list ไม่ filter เฉพาะข้อมูลที่โหลดใน browser

## 9. Accounting integration

AP ใช้ posting rule ไม่ใช้ account code ที่ hardcode ใน UI ตัวอย่างขั้นต่ำ:

```text
Invoice:
Dr Expense / Inventory / Asset
Dr Input VAT or Pending Input VAT
Cr Trade Accounts Payable

Payment:
Dr Trade Accounts Payable
Cr WHT Payable
Cr Bank / Cash Clearing
Dr/Cr Realized FX Gain or Loss (เมื่อมี)
```

Posting payload ต้องมี `source_type`, `source_id`, `source_version`, `posting_rule_code`, `posting_date`, lines, dimensions, currency/rate snapshots และ deterministic idempotency key ตาม Accounting Foundation

## 10. Permissions and segregation of duties

Permissions ที่เสนอ:

```text
ap.invoice.view
ap.invoice.create
ap.invoice.edit
ap.invoice.submit
ap.invoice.approve
ap.invoice.void
ap.invoice.reverse
ap.invoice.override_match
ap.invoice.override_tax
ap.payment.view
ap.payment.create
ap.payment.edit
ap.payment.submit
ap.payment.approve
ap.payment.release
ap.payment.execute
ap.payment.retry
ap.payment.cancel
ap.payment.reverse
ap.payment.override_rate
ap.payment.override_wht
ap.payment.batch_approve
ap.attachment.view
ap.attachment.manage
ap.report.aging
```

- เมื่อ Workflow เปิด ต้องรองรับ maker-checker และ policy ห้ามผู้เตรียมอนุมัติเอกสารตนเอง
- การเลือก bank account, override rate/WHT/match และ release payment ควรแยก permission
- Batch action ต้องตรวจสิทธิ์, workflow stage, version และ business rule แยกต่อเอกสาร พร้อมผลลัพธ์รายใบ
- เลขบัญชีธนาคารใน list/approval ต้อง mask และเปิดดูเต็มเฉพาะผู้มีสิทธิ์

## 11. Cross-cutting requirements

- Canonical amount/rate ใช้ decimal string และ rounding policy จาก Foundation ห้ามใช้ JavaScript `number` เป็น source of truth
- ทุก mutation รับ `doc_version`; conflict ต้องเสนอ reload/compare และไม่ทิ้งข้อมูลที่ผู้ใช้กรอก
- Directory ใช้ server-side pagination, search, sort และ filters
- เก็บ audit สำหรับ create/update/submit/approve/return/reject/post/execute/retry/void/reverse และ override ทุกชนิด
- UI ต้องมี loading, empty, no-result, permission-denied, partial batch failure, network error และ stale-version state
- รองรับ keyboard และ responsive layout; ตารางกว้างต้องมี mobile summary/card หรือ controlled horizontal scroll
- AI/OCR แสดง provenance, confidence และ field-level review; ห้าม auto-approve หรือ auto-post ใน Phase 1

## 12. Proposed delivery slices

1. AP Invoice + posted open item + GL trace
2. Payment Voucher + invoice application + WHT/FX + GL trace
3. Optional invoice/payment Workflow และ approval queue
4. Aging/dashboard/tax exception views
5. Attachments/OCR/budget/cheque output และ bank integration ตาม capability readiness

## 13. Module acceptance criteria

- Invoice และ Payment ทุกใบ trace ไปยัง source, workflow, posting event และ generated JV ได้
- Dashboard outstanding reconcile กับ posted open items และ invoice directory ณ as-of date เดียวกัน
- Posted invoice ถูก settle บางส่วนและทั้งหมดได้โดยยอด open amount ถูกต้อง
- Payment retry ไม่สร้าง payment, WHT certificate, application หรือ ledger ซ้ำ
- Workflow ปิดแล้วไม่มีสถานะ Approved/Rejected ปลอม; Workflow เปิดแล้ว final approval จึง release/post ได้ตาม policy
- Foreign-currency invoice เก็บ booking rate และ payment เก็บ settlement rate โดย FX entry balance ใน functional currency
- Posted document แก้ไม่ได้; correction ใช้ audited reversal/adjustment document
- UI/API บังคับ BU isolation, permission, decimal precision และ optimistic concurrency

## 14. Open questions

1. Phase 1 ต้องรวม Deposit, Debit Note และ Credit Note ใน release เดียวกับ Standard Invoice หรือไม่
2. AP Invoice จะ post เมื่อ final approval หรือมี separate `Post` permission/action
3. Payment จะ post ตอน approval, release, bank acknowledgement หรือ reconciliation สำหรับแต่ละ payment method
4. ใช้ Inventory PO/GRN service และ matching tolerance configuration ชุดใด
5. WHT certificate/register owner อยู่ใน AP หรือ shared Tax service และออกเลขเมื่อใด
6. Input VAT claim deadline/status ต้องรองรับเฉพาะประเทศไทยใน Phase 1 หรือออกแบบ multi-jurisdiction ตั้งแต่แรก
7. Vendor bank account approval/verification อยู่ใน Vendor master หรือ AP payment
8. Budget service และ Attachment service พร้อมใช้งานใน release แรกหรือใช้ feature flag
9. Aging policy ใช้ document date หรือ due date เป็นหลัก และแสดง credit balance อย่างไร
10. Bank/cheque execution ต้องรองรับ partial failure และ reconciliation ใน Phase 1 ระดับใด
