# General Ledger — Implementation Readiness

## 1. Purpose and authority

เอกสารนี้กำหนด integration boundary ของ General Ledger สำหรับ Manual Journal Voucher และ Accounting Events จาก AP/AR/Inventory/Asset โดยเชื่อม [Accounting Foundation](../accounting-foundation.md), [Journal Voucher Design](general-ledger-journal-voucher-design.md) และ [AP Implementation Readiness](accounts-payable-implementation-readiness.md)

- Functional accounting rules อยู่ใน Foundation/JV design
- เอกสารนี้เป็น source of truth สำหรับ implementation status, adapter boundary, source-generated JV policy, Accounting Event contract, control-account rules และ reconciliation
- Backend OpenAPI เป็น source of truth ของ wire format เมื่อ publish แล้ว เอกสารนี้ยังเป็น source of truth ของ semantics/invariants
- Frontend mock repository เป็น development fixture ไม่ใช่หลักฐานว่า backend integration หรือ posting สำเร็จ

สถานะตรวจล่าสุด: 2026-09-11

## 2. Current module map

```text
Accounting UI
  -> Journal Voucher Directory / Detail
       -> query and mutation hooks
       -> JournalVoucherRepository
            -> current: in-memory mock repository
            -> target: HTTP repository through backend-gateway
  -> Journal Staging Workbench
       -> current: in-memory mock repository
       -> target: asynchronous batch/record/status APIs

Source modules
  -> AP / AR / Inventory / Asset Accounting Event
  -> Journal Staging
  -> Group + Map + Validate + Duplicate Check
  -> Generated Journal Voucher
  -> Optional GL workflow for Manual JV only by default
  -> Posting Engine
  -> Posting Event + immutable Ledger Entries
```

## 3. Implementation status

ใช้ status vocabulary เดียวกับ AP:

```text
design_only | ui_prototype | frontend_ready | backend_ready | integrated | production_verified
```

| Capability                           | Current status                      | Limitation                                                                       | Target                |
| ------------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------- | --------------------- |
| JV directory/detail/editor           | `ui_prototype`                      | Frontend uses in-memory repository                                               | `integrated`          |
| Repository boundary                  | `frontend_ready`                    | Mock implementation only; HTTP adapter pending                                   | `integrated`          |
| Manual JV lifecycle                  | `ui_prototype`                      | Local transition is not canonical validation/posting                             | `integrated`          |
| Source-generated JV read-only policy | `frontend_ready`                    | Types, fallback capabilities and source trace exist; backend enforcement pending | `integrated`          |
| Journal Staging                      | `ui_prototype`                      | Mock batch processing; no worker/revision/error records                          | `integrated`          |
| Posting/idempotency                  | `backend_ready` per backend runbook | Frontend/runtime integration not verified in this repository                     | `production_verified` |
| Control-account policy               | `design_only`                       | Account master/backend validation pending                                        | `integrated`          |
| Source-to-JV trace                   | `frontend_ready`                    | Mock AP source link; canonical response pending                                  | `integrated`          |
| Subledger-to-GL reconciliation       | `design_only`                       | No canonical read model/endpoint                                                 | `integrated`          |

Status เปลี่ยนเป็น `integrated` ได้เมื่อ frontend HTTP adapter, backend endpoint, contract tests และ end-to-end smoke test ผ่านพร้อมกันเท่านั้น

## 4. Canonical routes and API prefix

Frontend:

```text
/accounting
/accounting/journal-voucher
/accounting/journal-voucher/new
/accounting/journal-voucher/:id
/accounting/journal-staging
/accounting/settings
```

Gateway API:

```text
/api/:bu_code/accounting/journal-vouchers
/api/:bu_code/accounting/journal-staging/...
/api/:bu_code/accounting/posting-events/...
/api/:bu_code/accounting/reconciliation/...
```

Frontend constants ใช้ proxy form `/api/proxy/api/:bu_code/accounting/...` ซึ่ง `httpClient` resolve ไป backend gateway

## 5. Accounting Event contract

ทุก subledger ส่ง canonical event ผ่าน Journal Staging ห้ามสร้าง JV/Ledger Entry โดยตรง

```text
event:
  bu_id
  source_system
  source_type
  source_id
  source_no
  source_version
  event_type: post | reverse | correct
  posting_rule_code
  posting_date
  transaction_currency_code
  functional_currency_code
  idempotency_key
  correlation_id
  payload_hash

lines[]:
  source_line_id
  account_role or resolved account_id according to source policy
  department_id
  dimensions[]
  transaction_debit / transaction_credit
  exchange_rate_snapshot
  functional_debit / functional_credit
  tax_posting_ref

control_totals:
  record_count
  transaction_totals_by_currency[]
  functional_debit
  functional_credit
```

Response/status:

```text
accepted_event_id
staging_batch_id
staging_attempt_id
generated_journal_id
generated_journal_no
generated_revision
posting_event_id
status
validation_errors[]
correlation_id
```

Exact identity default:

```text
bu_id + source_system + source_type + source_id + source_version + event_type
```

หรือใช้ deterministic idempotency key ที่มี unique constraint ภายใน BU Retry เดิมต้องคืน event/JV/posting result เดิม

## 6. Manual and source-generated policy

### Manual JV

- GL เป็น source owner
- แก้ accounting fields ได้เฉพาะ Draft และตาม permission
- ใช้ Optional GL Workflow, Schedule Post, Auto-Reverse, Void และ Manual Reverse ตาม policy
- Copy สร้าง Manual Draft ใหม่โดยไม่ copy identity/posting/workflow

### Source-generated JV

- Source module เป็นเจ้าของ business document, approval และ correction
- GL แสดง header, lines, mapping snapshot, source version, staging attempt และ posting event แบบ read-only
- ห้าม Edit, Copy, Void หรือ Reverse จาก GL UI/API
- `Open source` นำผู้ใช้กลับ document owner เมื่อ route/permission พร้อม
- การ correct/reverse ส่ง event/version ใหม่จาก source owner และ link กับ original event/JV
- ไม่ใช้ GL workflow ซ้ำโดย default; Strict Staging release เป็น accounting control gate ไม่ใช่ source business approval
- Backend ส่ง `capabilities` เป็น canonical action policy; frontend fallback ใช้เพื่อ safe read-only เท่านั้น

## 7. Control-account policy

Account master/posting policy ต้องรองรับ:

```text
control_account_type: ap | ar | inventory | asset | tax | none
manual_posting_allowed
allowed_source_types[]
requires_source_reference
requires_reconciliation
```

- Trade AP default: manual posting ไม่อนุญาต; รับ source types ที่ AP posting rule กำหนด
- Exception manual posting ต้องมี dedicated permission, reason และ audit และแสดงใน reconciliation exception queue
- UI filter account lookup ตาม policy เพื่อ feedback แต่ Posting Engine ตรวจซ้ำเสมอ
- Mapping Rule ต้อง resolve account role จาก source payload ห้ามให้ source UI hardcode control-account code เป็น canonical value

## 8. Workflow and posting ownership

| Event                      | Owner               | Result                                   |
| -------------------------- | ------------------- | ---------------------------------------- |
| Approve AP Invoice/Payment | AP Workflow         | AP business document พร้อมส่ง event      |
| Release Strict Staging     | Accounting operator | Generated JV พร้อม submit/post           |
| Approve Manual JV          | GL Workflow         | Manual JV พร้อม post/schedule            |
| Post Journal Voucher       | Posting Engine      | Posting Event + immutable Ledger Entries |
| Correct AP posting         | AP                  | AP correction/reversal event             |
| Reverse Manual JV          | GL                  | Linked reversal JV                       |

Generated JV ห้ามสร้าง AP/GL approval ซ้ำโดย implicit behavior หาก BU ต้องการสองชั้นต้องเป็น explicit policy snapshot พร้อมแสดงทั้งสอง stages

## 9. Source trace and capabilities

JV response ควรมี:

```text
source_system, source_type, source_id, source_no, source_version
event_type, posting_rule_code
is_source_generated
source_links[]
staging_batch_id, staging_attempt_id, generated_revision
posting_event_id
capabilities:
  can_edit_accounting_fields
  can_submit
  can_approve / can_return / can_reject
  can_retry_post
  can_void
  can_reverse
  can_open_source
```

Backend คำนวณ capabilities จาก permission, workflow assignment, source policy, status และ `doc_version` Frontend ห้าม infer สิทธิ์อนุมัติหรือแก้รายการจาก status อย่างเดียว

## 10. AP-to-GL reconciliation

Canonical invariant:

```text
AP posted open-item carrying balance
+ unapplied AP debit/credit adjustments according to reporting policy
+ payment clearing items when configured
+ explicit reconciliation adjustments
= GL AP control-account balance
```

Reconciliation endpoint/read model ต้องอธิบายอย่างน้อย:

- AP source event ที่ยังไม่มี generated JV
- Generated JV ที่ validation/posting ล้มเหลว
- Posted JV ที่ไม่มี valid source link
- AP open item/application ที่ไม่มี posting event
- Source/JV version mismatch
- Reversal ที่ ledger สำเร็จแต่ source restore/correction ยังไม่ complete
- Manual posting เข้า AP control account
- Total และ variance แยก BU, period, currency และ control account

Drill-down chain:

```text
GL account/period
  -> reconciliation exception
  -> posting event
  -> generated JV
  -> source AP Invoice/Payment
  -> AP open item/application
```

## 11. Error and asynchronous status contract

ใช้ common error shape เดียวกับ AP:

```text
code, message, correlation_id, retryable
outcome: not_started | completed | failed | unknown
field_errors[]
current_document/current_doc_version when allowed
dependency
```

- Staging/process/posting อาจตอบ `202 Accepted` พร้อม status URL
- Unknown outcome ห้าม blind retry ให้ query ด้วย correlation/idempotency reference
- Duplicate/idempotent retry คืน original result
- Per-Journal Processing คืนผลต่อ JV ห้ามซ่อน partial failure ใน Batch status เดียว

## 12. Required UI states

- Loading, empty, filtered no-result, error และ permission-denied
- Manual Draft edit และ posted/read-only
- Source-generated read-only พร้อม source trace/Open source
- Workflow assigned/not-assigned actions
- Post failed/retry และ unknown outcome/check status
- Version conflict โดยไม่ทิ้ง user draft
- Strict Staging partial success/error/revision states
- Thai/English, BU timezone, currency precision, keyboard และ mobile overflow

### Canonical JV UI shell

`Template Voucher Detail` เป็น baseline ของหน้า JV ทั้ง view/edit/mobile โดย route JV ต้อง reuse shared `AccountingDetail` shell ไม่สร้าง page composition แยกต่างหาก ความต่างของ JV ให้ขับด้วย document kind และ backend capabilities เท่านั้น:

- Manual JV แสดง Edit/Copy/Template/Void/AI Suggest ตาม permission/status
- Source-generated JV ใช้ shell เดิมแบบ read-only ซ่อน action ที่ source owner ต้องรับผิดชอบ
- `Open source`, source version, event type และ posting rule อยู่ใน toolbar/summary metadata โดยไม่เพิ่ม dashboard-style cards กลางฟอร์ม
- Entry grid และ balance summary ต้องเหมือน Template Voucher เพื่อให้ keyboard, density และ responsive behavior สม่ำเสมอ

## 13. Delivery sequence

1. HTTP `JournalVoucherRepository` และ Journal Staging repository adapters
2. Final OpenAPI alignment, server-side directory และ error/capability mapping
3. Source-generated JV trace/read-only enforcement ทั้ง frontend/backend
4. Control-account metadata, account lookup filtering และ Posting Engine validation
5. AP Accounting Event ingestion/idempotency/reversal contract
6. AP-to-GL reconciliation read model, dashboard widgets และ drill-down
7. Contract/integration/concurrency/security/operational verification

## 14. Definition of Done

- Production configuration ไม่เรียก mock repository
- Frontend routes/hooks ใช้ canonical gateway endpoints
- Manual/source-generated behavior และ capabilities ถูก backend enforce
- AP post/retry/reversal ไม่สร้าง JV/Ledger Entry ซ้ำและไม่ทำ open-item/tax state แยกขาดจาก ledger
- AP control-account balance reconcile กับ AP read model หรือมี actionable exceptions ครบ
- source → staging attempt → generated JV → posting event → ledger trace ได้สองทาง
- TypeScript, relevant tests, React Doctor, backend transaction tests และ production-like smoke test ผ่าน
