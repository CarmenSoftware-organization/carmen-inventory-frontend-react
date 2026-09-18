# Accounts Payable — Implementation Readiness

## 1. Purpose and authority

เอกสารนี้เชื่อม functional design ของ Accounts Payable กับ implementation จริง เพื่อให้ frontend, backend, QA และ product ใช้สถานะและ integration boundary ชุดเดียวกัน

- Functional rules ยังอ้างอิง [AP Module](accounts-payable-design.md), [Invoice](accounts-payable-invoice-design.md), [Payment](accounts-payable-payment-design.md) และ [Dashboard](accounts-payable-dashboard-design.md)
- เอกสารนี้เป็น source of truth สำหรับ implementation status, canonical frontend routes, adapter boundary, cross-cutting API contract, decision defaults และ Definition of Done
- HTTP endpoint และ schema ที่นี่เป็น target contract จนกว่าจะ publish OpenAPI จาก backend เมื่อ OpenAPI พร้อม ให้ OpenAPI เป็น source of truth ของ wire format และเอกสารนี้อธิบาย semantics/invariants ต่อไป
- `ap-mock-repository.ts`, browser storage, seed values และ client-generated journal preview เป็น development fixture ไม่ใช่ accounting source of truth
- AP Accounting Event, generated-JV immutability, control-account policy และ reconciliation ต้องสอดคล้องกับ [General Ledger — Implementation Readiness](general-ledger-implementation-readiness.md)

สถานะตรวจล่าสุด: 2026-09-11

## 2. Current module map

```text
ProtectedShell / Accounting route boundary
  -> AP Dashboard
       -> useApDashboard
  -> AP Invoice Directory / Detail
       -> useApInvoices / useApInvoice / save and action hooks
  -> AP Payment Directory / Detail
       -> useApPayments / useApPayment / save and action hooks
  -> ApRepository
       -> current: browser-local mock repository
       -> target: HTTP repository through backend-gateway

Required backend collaborators
  -> Vendor master and verified payment instruction
  -> PO / GRN / service acceptance and matching policy
  -> Currency / exchange rate / accounting period
  -> Workflow / permission / activity / attachment services
  -> Journal Staging and Accounting posting engine
  -> Tax/WHT register and bank execution adapter when enabled
```

Frontend ต้องไม่ import mock repository จาก page โดยตรง Page เรียกผ่าน query/mutation hooks และ hooks ต้องเปลี่ยน implementation ระหว่าง mock กับ HTTP adapter ได้โดยไม่เปลี่ยน page-level interaction

## 3. Implementation status

Status vocabulary:

```text
design_only        documented but not represented in the application
ui_prototype       interactive UI backed by mock/local data
frontend_ready     UI and adapter contract ready; backend may still be unavailable
backend_ready      endpoint and persistence exist; integration not yet verified
integrated         frontend/backend contract tests and smoke tests pass
production_verified migration, security, observability and operational checks pass
```

| Capability                        | Current status | Evidence/limitation                                                       | Target for AP Phase 1                           |
| --------------------------------- | -------------- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| AP Dashboard                      | `ui_prototype` | Mock aggregate; no permission scope, freshness or partial-widget contract | `integrated`                                    |
| Invoice directory/detail/draft    | `ui_prototype` | Browser-local persistence; client-side list                               | `integrated`                                    |
| Duplicate invoice control         | `design_only`  | No normalized duplicate service or override audit                         | `integrated`                                    |
| PO/GRN matching                   | `ui_prototype` | References/status are manually entered; no tolerance engine               | `integrated`                                    |
| Tax invoice detail                | `ui_prototype` | Summary fields only; no canonical filing record                           | `integrated`                                    |
| Invoice workflow/posting          | `ui_prototype` | Local state transition; no workflow task, open item or posting event      | `integrated`                                    |
| Payment proposal/grouping         | `ui_prototype` | Creates one local group; does not return multiple proposals               | `integrated`                                    |
| Payment Voucher/WHT/FX preview    | `ui_prototype` | Decimal calculation exists for preview; backend is not source of truth    | `integrated`                                    |
| Payment approval queue            | `ui_prototype` | Derived from document lifecycle, not workflow assignments                 | `integrated`                                    |
| Release/execution/posting         | `ui_prototype` | Local mock collapses execution and posting                                | `integrated` with explicit posting-point policy |
| Open-item reservation/application | `ui_prototype` | Local mutation only; no database locking/concurrency                      | `integrated`                                    |
| Permission/SoD                    | `design_only`  | Capabilities derive from lifecycle, not authenticated grants              | `integrated`                                    |
| Attachments                       | `design_only`  | Read-only placeholder; shared file contract unverified                    | optional capability gate                        |
| Bank file/API/reconciliation      | `design_only`  | Deferred; Phase 1 may use controlled manual execution                     | deferred unless explicitly enabled              |

ทุก pull request ที่เปลี่ยนสถานะต้องอัปเดตตารางนี้ พร้อม link ไป OpenAPI/migration/test/runbook evidence ที่เกี่ยวข้อง ห้ามเปลี่ยนเป็น `integrated` จากการมี UI หรือ endpoint อย่างใดอย่างหนึ่งเพียงอย่างเดียว

## 4. Canonical frontend routes

Phase 1 ใช้ route เดิมของ frontend เพื่อรักษา navigation compatibility:

```text
/accounting/accounts-payable
/accounting/accounts-payable/invoice
/accounting/accounts-payable/invoice/new
/accounting/accounts-payable/invoice/:id
/accounting/accounts-payable/payment
/accounting/accounts-payable/payment/new
/accounting/accounts-payable/payment/:id
/accounting/accounts-payable/payment-approvals
```

- Edit mode ใช้ state/query เช่น `?mode=edit` หรือ local form mode บน detail route เดิม ไม่ต้องมี route `/edit` แยกใน Phase 1
- Dashboard drill-down ต้อง preserve canonical filter context เช่น `source`, `as_of`, `paid_from`, `paid_to`, `due_bucket`, `lifecycle`, `settlement`, `tax`, `stage` และ `assignee`
- Backend REST resources ใช้ `/invoices` และ `/payments` แบบพหูพจน์ได้ โดยไม่ต้องตรงกับ frontend URL
- หากเปลี่ยน frontend route ภายหลัง ต้องมี redirect และทดสอบ bookmark/breadcrumb/navigation

## 5. Frontend/backend ownership

| Concern           | Frontend responsibility                                       | Backend responsibility                                           |
| ----------------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Validation        | Immediate shape/input feedback; display field and line errors | Canonical business validation and authorization                  |
| Amount preview    | Exact decimal preview for user feedback                       | Canonical totals, rounding, tax, FX and posting preview          |
| Document number   | Display draft reference/returned number                       | Atomic running number allocation                                 |
| Capabilities      | Render only actions returned/allowed                          | Permission, workflow assignment, SoD and state validation        |
| Matching          | Display source, comparison and exception                      | Fetch source, tolerance evaluation and override authorization    |
| Workflow          | Display current stage/tasks/history                           | Snapshot definition and execute workflow transition              |
| Posting           | Display preview and generated JV link                         | Journal Staging, posting transaction and ledger integrity        |
| Open item         | Display carrying/open/reserved/available amounts              | Lock, reserve, apply, release and restore amounts atomically     |
| Payment execution | Confirm user intent and display result/uncertainty            | Idempotent submission, status query, callback and reconciliation |
| Audit             | Display activity timeline                                     | Immutable actor/time/before-after/reason/correlation evidence    |
| Formatting        | BU locale/date/amount presentation                            | Store UTC/decimal/currency snapshots and BU-scoped policy        |

UI ต้องไม่เปลี่ยน document lifecycle, settlement, execution, tax หรือ posting state ด้วยการคำนวณเอง ให้ mutation สำเร็จเมื่อ backend ส่ง document snapshot ใหม่กลับมาเท่านั้น

## 6. Repository and HTTP adapter contract

`ApRepository` เป็น application boundary และ HTTP implementation ต้องครอบคลุมอย่างน้อย:

```text
Dashboard
  getDashboard(context)
  getPaymentApprovalSummary(context)

Invoice
  listInvoices(query)
  getInvoice(id)
  createInvoice(command)
  updateInvoice(id, command)
  checkInvoiceDuplicate(command)
  previewInvoiceMatch(command)
  getInvoicePostingPreview(id, version)
  submit / approve / return / reject / retryPost / void / correct

Payment
  listOpenItems(query)
  createPaymentProposals(command) -> one or more proposal groups
  listPayments(query)
  getPayment(id)
  createPayment(command)
  updatePayment(id, command)
  getPaymentPostingPreview(id, version)
  submit / approve / return / reject / release
  getExecutionStatus(id, correlationId)
  retryExecution / retryPost / cancel / reverse

Shared
  getActivity(documentType, id)
  batchApprove(command)
  batchRelease(command)
```

### 6.1 List contract

Directory endpoints ต้องเป็น server-side และรับอย่างน้อย:

```text
page, per_page
sort=field:asc|desc
search
date ranges and amount ranges
multi-value lifecycle/workflow/settlement/tax/match/execution filters
as_of and due_bucket for open-item views
assigned_to_me/stage for approval views
```

Response:

```text
data[]
page: { number, size, total_items, total_pages }
filter_context
generated_at
data_version when the result is an aggregate snapshot
```

Select-all และ batch action ต้องส่ง explicit selection scope หรือ document IDs ห้ามตีความว่า hidden pages ถูกเลือกโดยอัตโนมัติ

### 6.2 Mutation contract

ทุก mutation ส่ง:

```text
doc_version
idempotency_key for commands with external/accounting side effects
reason/comment when required
client_request_id for support trace
```

Backend คืน document snapshot, capabilities, workflow summary และ references ที่อัปเดตแล้ว ห้ามให้ frontend ประกอบสถานะถัดไปเอง

### 6.3 Error contract

```text
code
message
correlation_id
retryable
outcome: not_started | completed | failed | unknown
field_errors[]: { path, code, message }
current_document and current_doc_version for version conflict when allowed
dependency when a downstream service failed
```

- `409 VERSION_CONFLICT` ต้องให้ UI reload/compare โดยไม่ทิ้ง draft ที่ผู้ใช้กรอก
- Execution ที่ `outcome=unknown` ห้ามแสดง blind Retry; UI ต้อง query status ด้วย correlation/idempotency reference ก่อน
- Partial batch response คืนผลราย document พร้อม success/failure/unknown แยกกัน
- Dashboard partial failure คืน `widget_status[]` และ timestamp ต่อ widget ไม่แทนตัวเลขที่ผิดด้วย mock/fallback value

### 6.4 Decimal, date and currency

- Amount/rate ใน wire format เป็น decimal string
- Backend ใช้ currency precision และ `HALF_UP`/configured rounding policy; frontend preview ต้องรับ precision/policy จาก response/config
- วันที่ธุรกิจเป็น local date ตาม BU; timestamp เป็น UTC พร้อม timezone context
- Dashboard/open-item foreign amount ใช้ carrying functional amount จาก ledger snapshot ไม่ revalue ใน browser
- Frontend แปลง decimal เป็น JavaScript `number` ได้เฉพาะ presentation/chart ที่ไม่ถูกใช้ย้อนกลับในการตัดสินใจหรือ mutation

## 7. State and command boundaries

### 7.1 Invoice

```text
draft
  -> submitted          workflow enabled
  -> posting            workflow disabled
submitted
  -> draft              return/reject outcome
  -> posting            final approval
posting
  -> posted
  -> post_failed
posted
  -> reversed           linked correction/reversal only
```

Settlement (`unpaid | partially_paid | paid`), tax, match และ workflow เป็นคนละแกนกับ lifecycle

### 7.2 Payment

```text
draft
  -> submitted          workflow enabled
  -> ready_to_release   workflow disabled
submitted
  -> draft              return/reject outcome
  -> ready_to_release   final approval
ready_to_release | execution_failed
  -> processing         release/execute
processing
  -> executed
  -> execution_failed
executed
  -> posting
posting
  -> posted
  -> post_failed
posted
  -> reconciled         bank/reconciliation axis
  -> reversed           linked reversal
```

ข้อบังคับ:

- Final Approval ห้าม execute หรือ post โดยอัตโนมัติ เว้นแต่มี explicit BU/payment-method policy ที่ backend snapshot และ UI แสดงชัดก่อนยืนยัน
- Release, Retry Execution, Retry Post, Cancel และ Reverse เป็นคนละ command
- Bank execution status และ accounting lifecycle ต้องไม่เก็บรวมเป็น status เดียว
- Open-item application ถือว่าสำเร็จตาม configured posting point เท่านั้น; approval อย่างเดียวห้ามเปลี่ยน Invoice เป็น paid

## 8. Phase 1 decision defaults

ค่า default ต่อไปนี้ใช้ unblock contract/design จน product/accounting owner บันทึก decision อื่น:

| Decision              | Phase 1 default                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------- |
| Backend owner         | `apps/micro-business` ผ่าน `apps/backend-gateway`                                                          |
| Frontend route        | เอกพจน์ `/invoice`, `/payment` ตาม router ปัจจุบัน                                                         |
| Invoice scope         | Standard Invoice ทั้ง PO-based และ non-PO                                                                  |
| Deposit/CN/DN         | รองรับ schema/reference ที่จำเป็น แต่ full standalone lifecycle เป็น Phase 1.5                             |
| Invoice posting point | หลัง Submit เมื่อ workflow ปิด หรือหลัง final approval เมื่อ workflow เปิด                                 |
| Payment approval      | ทำให้เป็น `ready_to_release`; ไม่ถือว่าจ่ายหรือ post แล้ว                                                  |
| Payment execution     | Phase 1 รองรับ controlled manual execution reference หาก bank adapter ยังไม่พร้อม                          |
| Payment posting point | กำหนดต่อ payment method; default หลัง confirmed execution                                                  |
| Reservation           | เริ่มเมื่อ Payment Draft ถูก save และมี expiry/revalidation policy ฝั่ง backend                            |
| Currency              | หนึ่ง PV ต่อหนึ่ง vendor legal entity และ payment currency; cross-currency deferred                        |
| Jurisdiction          | Thailand profile เป็น first configured policy แต่ schema/status ไม่ hardcodeชื่อแบบประเทศไทยใน core domain |
| WHT event             | สร้างหลัง configured taxable event ที่สำเร็จ; retry idempotent                                             |
| Batch commands        | Per-document result เป็น default; atomic batch ต้อง opt-in และ backend รองรับ                              |

Decision ที่กระทบ schema/posting ต้องย้ายไป ADR หรือ decision log พร้อม owner, effective date และ migration impact

## 9. Required UI states

ทุก AP page ที่เชื่อม backend ต้องรองรับและทดสอบ:

- initial loading และ background refresh โดยไม่ทำให้ form หาย
- true empty, filtered no-result และ permission-denied แยกข้อความกัน
- field/line/tab validation errors จาก backend
- recoverable network/dependency error
- stale/version conflict พร้อม Reload/Compare/Copy unsaved values
- read-only posted/reversed/unauthorized states
- workflow assigned/not-assigned capability states
- execution outcome unknown โดยมี Check Status action
- partial batch success/failure/unknown
- dashboard partial-widget error และ stale timestamp
- desktop, keyboard, mobile card/controlled horizontal scroll
- Thai/English และ BU locale/timezone/currency precision

UI ห้ามแสดง seed/fallback amount เมื่อ backend error หรือไม่มีสิทธิ์ ให้แสดง explicit unavailable/empty/permission state

## 10. Delivery sequence

### Phase 1 — accounting integrity

1. AP schema, running code, repository HTTP adapter และ server-side directory
2. Invoice duplicate control, PO/non-PO validation, matching snapshot, tax detail, workflow และ posting/open item
3. Payment proposal grouping, reservation, Payment Voucher, WHT/FX preview และ workflow
4. Explicit release/execution/posting, retry/idempotency, application/settlement และ reversal
5. Dashboard/aging/tax exceptions จาก canonical read model พร้อม AP-to-GL reconciliation
6. Permission/SoD, audit, observability, migration และ operational runbook

### Phase 1.5 — operational completeness

- Deposit/vendor advance application
- Credit Note/Debit Note standalone correction flow
- Vendor statement reconciliation
- Payment run/calendar, remittance advice และ early-payment discount
- WHT/Input VAT register export และ Thailand electronic tax integration เมื่อพร้อม
- Payment batch approve/release และ cheque lifecycle เมื่อมี use case ยืนยัน

### Deferred

- Supplier portal, recurring invoice และ e-invoice ingestion
- Bank file/host-to-host และ automatic bank reconciliation
- Cross-currency Payment Voucher
- OCR/AI extraction และ anomaly recommendation
- Cash optimization/dynamic discounting

AI/OCR capability ห้ามเป็น dependency ของ accounting integrity และห้าม auto-approve, select bank account, release หรือ post

## 11. Definition of Ready for backend implementation

- Phase 1 decision defaults ได้รับ owner ยืนยันหรือมี ADR ทดแทน
- OpenAPI ระบุ list/mutation/error/batch contracts และ examples
- Prisma/database model ระบุ unique/idempotency/locking/audit constraints
- Posting rule codes และ Accounting Event payload ได้รับการยืนยันกับ GL owner
- Vendor, PO/GRN, Workflow, Tax, Attachment และ Bank dependency owner ระบุ endpoint/SLA/failure semantics
- Permission/SoD matrix และ sensitive-field masking ได้รับ security review
- QA มี acceptance fixtures สำหรับ decimal, timezone, duplicate, concurrency, partial settlement และ retry

## 12. Definition of Done

Capability เป็น `integrated` เมื่อ:

- frontend ใช้ HTTP adapter โดยไม่เรียก browser-local mock ใน production configuration
- backend บังคับ BU scope, permission, workflow, business validation และ `doc_version`
- commands ที่มี side effect ผ่าน idempotency/concurrency tests
- source document, workflow, posting event, generated Journal Voucher และ open-item application trace หากันได้
- list/filter/drill-down totals reconcile ภายใต้ context เดียวกัน
- loading/empty/error/permission/conflict/read-only/mobile/i18n states ผ่าน test
- contract, component/integration และ backend transaction tests ผ่าน

Capability เป็น `production_verified` เมื่อ migration, rollback/recovery, monitoring/alert, reconciliation query, security review และ production-like smoke test ผ่านครบ

## 13. Verification checklist

Frontend baseline:

```text
bunx tsc --noEmit
bunx vitest run routes/accounting/accounts-payable
React Doctor
```

Integration smoke sequence:

1. สร้าง PO-based และ non-PO Invoice; duplicate/match/tax exception ทำงานตาม policy
2. Submit แบบ workflow off/on และยืนยันว่า posting/open item/JV เกิดครั้งเดียว
3. สร้าง Payment proposal จากหลาย vendor/currency และยืนยันว่าแยกกลุ่มครบโดยไม่ทิ้ง selection เงียบ ๆ
4. Save Draft reservation สอง session บน Invoice เดียวกันและตรวจ available amount/concurrency
5. Approve แล้ว Invoice ยังไม่ paid; Release/Execute/Post ตาม policy จึงเปลี่ยน settlement
6. จำลอง execution success, failed และ unknown; retry ไม่สร้าง bank instruction/WHT/application/JV ซ้ำ
7. Partial/full payment และ reversal ทำให้ open amount/AP control account ถูกต้อง
8. Dashboard outstanding เท่ากับ aging/open items และ AP control account reconcile กับ GL
9. ตรวจ BU isolation, maker-checker, masked bank data และ unauthorized drill-down
10. ตรวจ Thai/English, BU timezone, currency precision และ mobile/read-only/error states
