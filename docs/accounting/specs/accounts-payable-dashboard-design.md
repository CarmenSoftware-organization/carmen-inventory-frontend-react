# Accounts Payable — Dashboard Design

## 1. เป้าหมาย

สร้าง AP Dashboard ที่ตอบคำถามหลักของ AP Officer, Financial Controller และ Approver ได้จากข้อมูลชุดเดียวกัน:

- ปัจจุบันมียอดเจ้าหนี้คงค้างเท่าใดและครบกำหนดเมื่อใด
- มี Invoice/Payment ใดรออนุมัติหรือกำลังติด exception
- มีเงินมัดจำและยอดจ่ายออกเท่าใด
- Input VAT/WHT และเอกสารภาษีใดต้องดำเนินการ
- ตัวเลขบน Dashboard reconcile กับ Invoice, Payment, AP open item และ GL ได้หรือไม่

เอกสารนี้ขยาย Dashboard/Aging section ใน [AP Module Design](accounts-payable-design.md) โดยอ้างอิง mockup Dashboard v4.4.3/v4.4.4 และ Payment Approval mockup

## 2. Scope

### Phase 1 must have

- BU-scoped dashboard พร้อม as-of date และ data freshness
- Total AP Outstanding, Prepaid Deposits และ Total Paid Out
- Aging buckets และ Due Date Tracker
- Pending Approval Queue แยกตาม document type
- Tax reconciliation/exception summary
- Drill-down ทุก card ไปยัง server-side Invoice, Payment หรือ tax list ด้วย filter เดียวกัน
- Reconciliation ระหว่าง KPI, bucket totals และ underlying records
- Loading, empty, partial-error, stale-data และ permission-aware states
- Thai/English และ BU date/amount format

### Optional เมื่อ capability พร้อม

- Payment Approval executive summary
- Budget alerts
- AI-generated executive brief และ anomaly explanation
- Auto refresh/push notification
- Saved dashboard filters และ export

### Deferred

- Cash forecasting
- Vendor concentration/risk scoring
- Cross-BU consolidated dashboard
- Predictive payment scheduling และ recommendation

## 3. Routes and navigation

```text
/accounting/accounts-payable                         # AP Dashboard
/accounting/accounts-payable/invoices                # drill-down target
/accounting/accounts-payable/payments                # drill-down target
/accounting/accounts-payable/payment-approvals       # approval dashboard/queue
```

Dashboard เป็น landing page ของ AP และต้องอยู่ใต้ `ProtectedShell` พร้อม section-level `RouteErrorBoundaryAdapter`

ทุก interactive card ส่ง canonical filter object ไป route ปลายทาง เช่น:

```text
source=ap-dashboard
as_of=2026-09-01
due_bucket=over_90
lifecycle=posted
settlement=open
```

ห้ามส่งเฉพาะ label ที่ตีความต่างกันได้ เช่น `1 - 30 Days` โดยไม่มี filter semantics

## 4. Global dashboard context

### Controls

| Control | Rule |
| --- | --- |
| Business Unit | required; ใช้ BU context ปัจจุบันและบังคับ permission ฝั่ง backend |
| As-of Date | default วันนี้ใน BU timezone; ใช้กับ outstanding, deposit, aging และ tax snapshot |
| Paid Date Range | default month-to-date; ใช้เฉพาะ flow metric เช่น Total Paid Out |
| Currency Display | Phase 1 เป็น functional currency; transaction currency ดูใน drill-down |
| Refresh | re-fetch snapshot และแสดง generated time; ไม่เปลี่ยน filter |

Header ต้องแสดง:

- ชื่อ BU/accounting entity
- As-of date และ timezone
- Functional currency
- `generated_at`/last refreshed time
- warning เมื่อข้อมูลบาง widget stale หรือ dependency ไม่พร้อม

## 5. KPI cards

### 5.1 Total AP Outstanding

ยอด functional open amount ณ as-of date ของ posted AP documents:

```text
sum(posted invoice/debit-note open amount)
- sum(unapplied credit-note balance applied in reporting policy)
```

Rules:

- รวมเฉพาะ posted open items ที่ posting date ไม่เกิน as-of date
- ไม่รวม draft, submitted, voided, reversed และ payment reservation ที่ยังไม่ post
- Partial payment ลด outstanding เฉพาะ application ที่ post แล้ว
- Vendor advance/prepaid deposit ที่เป็น asset ไม่รวมใน AP Outstanding
- Credit-balance vendor ต้องแสดงเป็น negative/credit balance อย่างโปร่งใสหรือแยก card ตาม reporting policy
- Card แสดง amount, open-item count และเทียบกับ prior period เมื่อมี comparable snapshot

Drill-down: Invoice directory ด้วย `lifecycle=posted&settlement=open&as_of=...`

### 5.2 Prepaid Deposits

ยอด debit balance ของ posted vendor advances/deposits ที่ยังไม่ถูก apply ณ as-of date

- แยก current asset/prepayment ออกจาก AP liability
- Deposit request ที่ยังไม่ post หรือยังไม่จ่ายจริงไม่รวม
- แสดง remaining unapplied amount ไม่ใช่ original deposit amount

Drill-down: Deposit/open-item view ด้วย `open_item_type=vendor_advance`

### 5.3 Total Paid Out

ยอด cash/bank outflow ของ AP payments ภายใน Paid Date Range:

- ใช้ payment ที่ถึง configured posted/executed state ตาม payment-method policy
- หัก reversed/voided payment และไม่รวม failed/cancelled instruction
- แสดง functional amount; bank fee และ WHT แสดง breakdown แยก ไม่ปะปนกับ net cash
- Label ต้องระบุช่วง เช่น `Paid Out — MTD` ไม่ใช้ยอด flow โดยไม่มี date range

Drill-down: Payment directory ด้วย `execution=executed_or_posted&paid_from=...&paid_to=...`

## 6. AP Aging Analysis

### Bucket definitions

ใช้ due date เทียบกับ as-of date และ bucket ต้องไม่ทับกัน:

| Bucket | Definition |
| --- | --- |
| Not Yet Due | `due_date > as_of` |
| Due Today | `due_date = as_of` |
| 1–30 Days Overdue | `1 <= as_of - due_date <= 30` |
| 31–60 Days Overdue | `31 <= days <= 60` |
| 61–90 Days Overdue | `61 <= days <= 90` |
| Over 90 Days | `days > 90` |
| Missing Due Date | posted open item ที่ไม่มี valid due date; exception bucket |

แต่ละ bucket แสดง:

- Functional open amount
- Open-item count
- Vendor count
- Percentage of total outstanding

Reconciliation invariant:

```text
Total AP Outstanding
= Not Yet Due + Due Today + overdue buckets + Missing Due Date
```

ถ้า credit balance แยกออกจาก aging ต้องแสดง reconciliation adjustment ชัดเจน

### Aging interaction

- คลิก bucket เปิด Invoice directory ด้วย `due_bucket` และ as-of date เดิม
- Hover/focus แสดงนิยาม bucket ไม่แสดงเฉพาะสี
- Overdue severity ใช้ icon/text ร่วมกับสีเพื่อ accessibility
- Foreign-currency item ใช้ functional open amount ณ carrying value ของ ledger ไม่ revalue ด้วย spot rate ฝั่ง browser

## 7. Due Date Tracker

Due Date Tracker เป็น operational view ของ Aging โดยเน้น action:

- Not Yet Due
- Due Today
- Overdue
- On Hold
- Scheduled for Payment

`Scheduled for Payment`/reserved amount ยังอยู่ใน AP Outstanding จน payment application post สำเร็จ แต่ UI แสดง reserved และ available-to-pay แยกกันเพื่อป้องกันความเข้าใจผิด

Drill-down ต้องเปิด list ที่สามารถสร้าง Payment proposal ได้เฉพาะ eligible open items

## 8. Pending Approval Queue

แสดง document count และ amount ตามประเภท:

- Standard Invoice
- Deposit
- Credit Note
- Debit Note
- Payment Voucher

Dashboard รองรับ view scope:

| Scope | Meaning |
| --- | --- |
| Assigned to Me | workflow tasks ที่ผู้ใช้ปัจจุบัน action ได้ |
| All Pending | รายการ pending ใน BU ที่ผู้ใช้มีสิทธิ์ดู |

Rules:

- Count มาจาก active workflow task ไม่ derive จาก document status string
- Workflow disabled document ไม่แสดงใน approval queue
- Returned/Rejected outcome ที่กลับ Draft ไม่ถือว่า pending approval
- Amount แสดงแยกตาม currency หรือ functional equivalent พร้อม label ชัดเจน
- คลิก card เปิด list/approval queue พร้อม document type, stage และ assignee filter
- Approve/Reject/Return จาก list ต้องตรวจ permission, SoD, workflow stage และ `doc_version` ต่อเอกสาร

## 9. Tax Reconciliation and Audit Exceptions

### Tax widgets

| Widget | Definition |
| --- | --- |
| Pending Input VAT | ยอด tax detail สถานะ `pending` ณ as-of date |
| Tax Invoices Near/Over Claim Deadline | จำนวนเอกสารที่เหลือวันน้อยกว่าค่าเตือนหรือเกิน deadline ตาม jurisdiction rule |
| Filed History | ยอด filed แยก filing period; read-only historical summary |
| Missing Tax Invoices | posted invoices ที่ tax document required แต่ข้อมูล/attachment ไม่ครบ |
| Pending Corrections | tax/match/posting exceptions ที่ยังไม่ resolve |
| WHT Pending Filing | WHT events/certificates ที่ post แล้วแต่ยังไม่ filed เมื่อ capability พร้อม |

คำว่า `Tax Invoices > 6 Mos` จาก mockup ต้อง derive จาก configurable claim deadline/alert threshold ไม่ hardcode 6 เดือนสำหรับทุก BU/jurisdiction

### Exception severity

```text
info | warning | blocking | overdue
```

แต่ละ exception แสดง count, amount เมื่อเกี่ยวข้อง, oldest age และ owner/queue โดยคลิกไปยัง actionable list

## 10. Payment Approval executive summary

แสดงบน `/payment-approvals` หรือเปิดเป็น optional section บน AP Dashboard:

- Pending approval: PV count และ total net pay
- Due today/urgent: count และ net pay
- Total WHT ของ pending selection
- Evidence coverage: จำนวน PV ที่ match/evidence ผ่านทั้งหมดเทียบกับ total
- Exception count: match, tax, budget, bank instruction และ duplicate risk

Payment approval KPI ต้องคำนวณจาก current filter/permission scope และแสดง currency context ห้ามใช้ค่า mock เช่น `100% Valid` โดยไม่มี denominator และ validation version

AI summary ต้องแสดง `generated_at`, source checks, confidence และ unresolved exceptions และห้ามเปลี่ยน workflow state เอง

## 11. Data and API contract

### Dashboard response shape

```text
context:
  bu_id, as_of_date, paid_from, paid_to
  functional_currency, timezone
  generated_at, data_version
summary:
  outstanding_amount, outstanding_count
  prepaid_amount, prepaid_count
  paid_out_amount, payment_count
aging[]:
  bucket_code, amount, item_count, vendor_count, percentage
approvals[]:
  document_type, task_count, functional_amount, assigned_to_me_count
tax[]:
  metric_code, amount, count, oldest_date, severity
exceptions[]:
  exception_code, count, amount, severity
reconciliation:
  outstanding_amount, aging_total, credit_adjustment, variance
widget_status[]:
  widget_code, status, generated_at, error_code
```

Amount ทั้งหมดเป็น decimal string

### Proposed endpoints

```text
GET /api/:bu_code/accounting/ap/dashboard
GET /api/:bu_code/accounting/ap/dashboard/payment-approvals
```

Query parameters:

```text
as_of
paid_from
paid_to
approval_scope=assigned_to_me|all_pending
```

Drill-down ใช้ Invoice/Payment directory endpoints เดิมพร้อม canonical filters ไม่สร้าง client-only result set

### Consistency and performance

- Response ทุก widget ใช้ as-of/filter context เดียวกัน
- Backend อาจใช้ read model/materialized aggregate แต่ต้องระบุ `generated_at` และ data version
- Cache key ต้องรวม BU, permission scope, as-of date และ filters
- Financial snapshot ห้าม cache ข้าม BU/user permission
- หากบาง widget fail ให้คืน partial result พร้อม `widget_status`; UI ยังแสดง widget ที่เชื่อถือได้

## 12. Permissions

| Section | Permission |
| --- | --- |
| Dashboard summary | `ap.dashboard.view` |
| Aging/open-item drill-down | `ap.report.aging` + invoice view scope |
| Approval queue | invoice/payment approval permission และ workflow assignment |
| Tax widgets | `ap.tax.view` |
| Payment/bank detail | `ap.payment.view`; bank data mask ตาม sensitive-data permission |

ตัวเลขที่ผู้ใช้ไม่มีสิทธิ์เปิด underlying record ต้องไม่แสดง หรือแสดง aggregated-only ตาม explicit policy ห้ามให้ count/amount รั่วจาก BU/role อื่น

## 13. UI states and responsive behavior

- Initial loading ใช้ skeleton ที่รักษา layout ของ KPI/widget
- Empty state แยก “ไม่มียอด” จาก “ไม่มีสิทธิ์” และ “filter ไม่พบข้อมูล”
- Partial error แสดงเฉพาะ widget ที่ผิดพร้อม Retry และ timestamp ของ widget อื่น
- Stale state แสดง warning เมื่อเกิน freshness SLA
- Amount card ต้องไม่ตัด currency/negative sign
- Desktop ใช้ KPI + two-column analysis; mobile เรียง KPI, urgent actions, aging, approvals และ tax ตามลำดับ
- Table-like bucket/card ต้องใช้ keyboard ได้ มี accessible name และไม่พึ่ง `onclick` บน `div` อย่าง mockup
- Chart ไม่จำเป็นใน Phase 1; exact amount/count และ drill-down สำคัญกว่า decoration

## 14. Error cases

- 400 — invalid as-of/date range หรือ date range เกิน policy
- 403 — ไม่มี dashboard/report/tax/approval permission
- 409 — aggregate version ไม่ตรงระหว่าง refresh; backend คืน snapshot ใหม่ทั้งชุด
- 422 — BU ไม่มี functional currency/accounting calendar configuration
- 424/503 — open-item/workflow/tax aggregate dependency ไม่พร้อม; ใช้ partial widget error

## 15. Acceptance criteria

- Total AP Outstanding เท่ากับผลรวม aging buckets หลัง credit adjustment และ variance เป็นศูนย์
- Draft/submitted/voided/reversed Invoice ไม่รวมใน outstanding
- Partial payment ลด outstanding เฉพาะเมื่อ application post แล้ว
- Vendor advance แสดงใน Prepaid Deposits และไม่ถูกนับซ้ำใน AP Outstanding
- Total Paid Out เปลี่ยนตาม date range และไม่รวม failed/cancelled/reversed payment
- Due Today/overdue bucket เปลี่ยนถูกต้องตาม BU timezone และ as-of date
- Dashboard card ทุกใบเปิด directory ด้วย filter ที่ให้ผลรวม/count ตรงกับ card
- Pending approval count มาจาก workflow task และ Assigned to Me แสดงเฉพาะงานที่ action ได้
- Tax deadline ใช้ configurable jurisdiction rule ไม่ hardcode 6 เดือน
- Foreign-currency items รวมด้วย ledger carrying functional amount ไม่คำนวณ spot rate ใน browser
- Partial widget failure ไม่ทำให้ dashboard ทั้งหน้าหาย และผู้ใช้เห็น freshness/error ชัดเจน
- ผู้ใช้ไม่เห็นยอดหรือ record ข้าม BU/permission scope
- loading/empty/no-result/error/stale/desktop/mobile states ผ่านการทดสอบ

## 16. Open questions

1. Aging report หลักใช้ due date ตามที่เสนอ หรือ business ต้องการ toggle document date
2. Credit-balance vendor จะหักใน outstanding, แสดง bucket แยก หรือทั้งสองแบบ
3. Prepaid Deposits ใช้ AP open item type หรือดึง balance จาก prepaid asset subledger/account
4. Total Paid Out ใช้ executed date, posting date หรือ bank-cleared date ต่อ payment method
5. Dashboard ต้องรองรับ consolidated multi-BU ใน release ใด
6. Freshness SLA และ aggregation strategy ต้อง real-time ระดับใด
7. Tax claim deadline/filing widgets รองรับประเทศไทยเท่านั้นใน Phase 1 หรือใช้ jurisdiction configuration
8. Budget alerts อยู่บน AP Dashboard หลักหรือ Payment Approval เท่านั้น
