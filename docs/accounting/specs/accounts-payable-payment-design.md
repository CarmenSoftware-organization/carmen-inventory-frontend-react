# Accounts Payable — Payment Design

## 1. เป้าหมายและขอบเขต

รองรับการเลือก posted AP open items, สร้าง Payment Voucher (PV), คำนวณ WHT/FX, ผ่าน optional approval แล้ว post/JV/ตัดหนี้ทันทีตาม FRD v2.16 และติดตามผลธนาคาร/การกระทบยอดโดยไม่สร้างรายการซ้ำ

Payment Preparation, Approval, Accounting Posting และ Bank Execution เป็นคนละ responsibility แม้ mockup จะแสดงอยู่ใน flow เดียวกัน

> Decision (2026-09-28, โอม): ใช้ AP Payment FRD v2.16 เป็น posting-point contract — Submit/Post ที่ validate ผ่านและไม่มี LOA หรือ final approval เมื่อมี LOA ต้องสร้าง PV posting/JV และตัดหนี้ทันทีแบบ atomic ใน backend. Save Draft ไม่ลง GL/ไม่ตัดหนี้. Bank execution/reconciliation เป็นสถานะติดตามแยก และไม่เป็น prerequisite ของ posting. Payment UI ปัจจุบันยังเป็น prototype.

## 2. Information architecture

```text
/accounting/accounts-payable/payment
/accounting/accounts-payable/payment/new
/accounting/accounts-payable/payment/:id
/accounting/accounts-payable/payment/:id?mode=edit
/accounting/accounts-payable/payment-approvals
```

### Payment directory/approval queue

| Column | Sort | Filter/search |
| --- | --- | --- |
| PV No./Payment Date | yes | number/date range |
| Vendor/Department or USALI summary | yes | vendor/department/search |
| Payment Method/Reference | yes | method/masked reference |
| Currency | yes | multi-select |
| Applied/Gross Amount | yes | amount range |
| WHT | yes | amount/type |
| Net Pay | yes | amount range |
| Workflow Stage | yes | assigned-to-me/stage |
| Execution Status | yes | multi-select |
| Due/Urgent | yes | due today/overdue/priority |
| Match/Risk Summary | yes | exception/score when enabled |

Tabs จาก mockup ได้แก่ Pending, Urgent/Due Today, Approved และ All แต่ `Approved` ต้องไม่สื่อว่าธนาคารจ่ายแล้ว

## 3. Payment proposal and grouping

### Eligible open items

- Invoice lifecycle เป็น `posted`
- Open amount มากกว่า 0
- ไม่ void/reversed หรืออยู่ใน payment ที่ active อยู่แล้วเกิน reserved amount
- Vendor/payment hold ไม่ทำงาน
- Due/discount date ผ่าน selection policy หรือผู้ใช้มีสิทธิ์ override
- Tax/match exception ที่ payment policy กำหนดต้อง resolve แล้ว

### Default grouping

เมื่อเลือก Invoice หลายใบ ระบบสร้าง proposal โดย group ตาม:

```text
BU + vendor legal entity + payment currency + payment method + beneficiary bank account
```

- หนึ่ง PV ต้องอยู่ใน BU เดียวและ vendor เดียว
- Invoice ต่าง currency ห้ามอยู่ PV เดียวใน Phase 1; UI อาจแสดงหลาย currency blocks แต่สร้าง PV แยกต่อ group
- Invoice หลายใบของ vendor/currency เดียวกันรวม PV ได้
- Batch เป็น container สำหรับ review/command หลาย PV ไม่ใช่ accounting transaction boundary เดียว
- Credit Note/Deposit application ต้องถูกเลือกและแสดงแยกจาก cash amount

## 4. Payment Voucher model

### Header

| Field | Rule |
| --- | --- |
| PV No. | backend-generated, read-only, unique ตาม BU/running-code policy |
| Vendor | derived จาก selected open items และล็อกเมื่อมี application |
| Payment Date | required; ใช้ settlement rate และ posting period |
| Payment Currency | required; Phase 1 ต้องตรงกับ invoice group เว้นแต่ explicit cross-currency capability |
| Settlement Rate | resolve ตาม payment date/rate type; override ต้องมี permission+reason |
| Payment Method | bank transfer, direct debit, cheque หรือ configured method |
| Bank/Cash Account | required; active, currency-compatible และ permission scoped |
| Beneficiary Instruction | snapshot จาก verified vendor bank instruction |
| Cheque/Bank Reference | reserve/generate ตาม method; unique เมื่อกำหนดแล้ว |
| Description/Remittance | required/default จาก invoice references |
| Urgency | derived จาก due date และ optional controlled priority |
| Workflow/Execution statuses | read-only แยกแกน |

### Invoice applications

| Field | Rule |
| --- | --- |
| Invoice/Open Item | posted, same BU/vendor/currency, eligible |
| Original/Open Amount | read-only transaction + functional amount |
| Apply Amount | มากกว่า 0 และไม่เกิน available open amount |
| Credit/Deposit Applied | link existing posted open item; ห้ามพิมพ์ offset อิสระ |
| WHT Base/Profile/Rate | derive ต่อ eligible line/tax rule; override แยก permission |
| WHT Amount | คำนวณด้วย tax precision และ aggregate ตาม certificate rule |
| Net Cash | applied payable less credits/deposits/WHT ตาม jurisdiction rule |
| Match/Evidence | read-only summary + links ไป Invoice/PO/GRN/attachments |

Concurrent payment drafts ต้อง reserve application amount หรือ revalidate ตอน Submit/Post หรือ final approval เพื่อป้องกัน double payment

## 5. WHT rules

Payment detail รองรับอย่างน้อย:

- Form type เช่น PND3/PND53 จาก tax profile ไม่ hardcode สำหรับทุกประเทศ
- Service/income type และ rate
- Taxable base ต่อ invoice line/application
- Payee tax ID/branch snapshot
- WHT amount, rounding, certificate no. และ filing linkage

กฎหลัก:

- WHT base ต้องมาจาก eligible pre-VAT/service amount ตาม tax rule ไม่ใช้ยอด invoice รวมทั้งใบโดยอัตโนมัติ
- Manual WHT override ต้องเก็บ calculated value, overridden value, reason และผู้อนุมัติ
- Certificate/register สร้างครั้งเดียวเมื่อ payment Posted สำเร็จตาม tax policy; final approval ที่ post สำเร็จถือเป็น posting point
- Cancel ก่อน taxable event ต้อง release reservation; หลัง post ใช้ reversal/cancellation document และรักษา certificate audit
- Retry ต้องใช้ idempotency key เดิมเพื่อไม่ออก certificate number ซ้ำ

## 6. Currency and realized FX

เก็บ rate แยก:

- Invoice booking rate/carrying functional amount จาก posted open item
- Payment settlement rate จาก payment date/rate policy
- Bank rate/fee เมื่อได้รับ bank result (ถ้ามี)

ตัวอย่าง conceptual posting เมื่อชำระ foreign-currency liability:

```text
Dr AP control                         carrying functional amount settled
Dr/Cr Realized FX loss/gain           balancing difference
Cr WHT payable                        local WHT amount
Cr Bank/Cash clearing                 actual functional cash amount
```

- Gain/loss ต้องเป็น balancing result จาก carrying amount เทียบ settlement components ไม่ตัดสินจากเครื่องหมาย `new rate - average rate` อย่างเดียว
- Partial application ใช้ carrying functional amountของ open-item portion ตาม configured allocation rule
- Transaction และ functional amount ส่งเป็น decimal string และ backend เป็น source of truth
- THB/functional currency rate = 1 และแก้ไม่ได้

## 7. Review and approval experience

Payment review แสดง:

- Vendor legal name/tax ID และ masked bank account
- PV no., payment date, method, cheque/bank reference และ prepared by
- Invoice applications พร้อม PO/GRN/contract, department/USALI, gross/VAT/WHT/net และ attachment
- Match/tolerance/tax/budget exceptions โดยเปิดดู evidence ได้
- Posting preview ของ AP, WHT, bank/clearing และ FX
- Net amount ที่กำลังอนุมัติและ currency ชัดเจน
- Activity/AI audit ที่ระบุ source และเวลาตรวจ

AI executive brief/score เป็น advisory เท่านั้น ต้องไม่ซ่อน exception, เปลี่ยนยอด, เลือก bank account หรืออนุมัติแทนผู้ใช้

Actions:

- Approve stage
- Return/Request Clarification พร้อม comment
- Reject ตาม workflow policy พร้อม reason
- Open Invoice/PO/GRN/attachment
- Print PV/cheque preview เมื่อ method รองรับ

## 8. Lifecycle, Workflow and execution

### Payment lifecycle

```text
draft
  -> submitted       (Workflow enabled)
  -> posting         (Workflow disabled; validated Submit/Post)
submitted
  -> draft           (Return/Reject outcome)
  -> posting         (Final approval)
posting
  -> posted
  -> post_failed
posted
  -> reversed        (linked reversal)
draft/submitted
  -> cancelled
```

Bank execution และ reconciliation เป็นแกนสถานะแยกจาก PV posting; backend ต้องเก็บผลลัพธ์และหลักฐานให้ trace ได้

### Approval vs execution

- Final approval ทำให้ PV Posted, สร้าง JV และตัด open item ทันทีเมื่อ validation ผ่าน
- Backend ต้อง revalidate version, open amount reservation, vendor hold, payment method, rate, period และ approval ใน posting transaction
- Cheque อาจมี `printed`, `issued`, `cleared`, `voided` เป็น method-specific state แยกจาก lifecycle
- Bank failure หลัง posting ต้องเป็น exception ที่ติดตามและแก้ด้วย correction/reversal; ห้ามลบ posting event หรือ application เงียบ ๆ
- Post/payment application/open-item update/WHT event ต้อง atomic เมื่อ Submit/Post หรือ final approval

## 9. Batch actions

- Batch approve/post แสดงยอดรวมแยกตาม currency ห้ามรวมหลาย currency เป็นยอดเดียว
- Confirm dialog แสดงจำนวน PV, total net ต่อ currency และ exception count
- Backend ตรวจ permission, workflow assignment, `doc_version`, segregation of duties และ eligibility แยกต่อ PV
- ผลลัพธ์เป็น per-item success/failure; ใบที่ fail ห้ามทำให้ใบที่ผ่านถูก rollback เว้นแต่ผู้ใช้เลือก atomic batch และ backend รองรับ
- ห้าม approve hidden rows จาก filter/page โดยไม่แสดง selection scope ชัดเจน

## 10. Payment posting and application

เมื่อ Submit/Post ผ่านโดยไม่มี LOA หรือ final approval ผ่านเมื่อมี LOA backend ต้องทำใน transaction เดียวกัน:

1. Lock PV และ AP open items
2. ตรวจ available open amount และ reservation ใหม่
3. Validate workflow, period, payment method/bank account, rate และ tax
4. สร้าง/generated JV ผ่าน Accounting posting contract
5. สร้าง immutable payment applications
6. Update open amounts และ settlement status
7. สร้าง WHT event/certificate instruction ตาม policy
8. เก็บ posting event, source links และ audit

Retry ด้วย idempotency key เดิมต้องคืนผลเดิมและไม่สร้าง ledger/application/certificate ซ้ำ

## 11. Actions and permissions

| Action | Allowed state | Notes |
| --- | --- | --- |
| Edit | draft | application/bank/tax fields ตาม permission |
| Save Draft | draft | reserve amount ตาม chosen strategy |
| Submit | draft | complete, balanced preview, no blocking exception |
| Approve/Return/Reject | submitted | Workflow enabled only |
| Retry Post | post_failed | ไม่สร้าง JV/application ซ้ำ |
| Cancel | draft, submitted | reason required; release reservations |
| Reverse | posted | linked reversal; restore open items only after reversal post succeeds |
| Print | method/status-based | cheque number reservation/audit required |
| Batch Approve | submitted assigned items | per-item result and SoD check |

## 12. Proposed API surface

```text
GET    /api/:bu_code/accounting/ap/open-items
POST   /api/:bu_code/accounting/ap/payment-proposals
POST   /api/:bu_code/accounting/ap/payments
GET    /api/:bu_code/accounting/ap/payments
GET    /api/:bu_code/accounting/ap/payments/:id
PATCH  /api/:bu_code/accounting/ap/payments/:id
POST   /api/:bu_code/accounting/ap/payments/:id/submit
POST   /api/:bu_code/accounting/ap/payments/:id/approve
POST   /api/:bu_code/accounting/ap/payments/:id/return
POST   /api/:bu_code/accounting/ap/payments/:id/reject
POST   /api/:bu_code/accounting/ap/payments/:id/retry-post
POST   /api/:bu_code/accounting/ap/payments/:id/cancel
POST   /api/:bu_code/accounting/ap/payments/:id/reverse
GET    /api/:bu_code/accounting/ap/payments/:id/activity
GET    /api/:bu_code/accounting/ap/payments/:id/posting-preview
POST   /api/:bu_code/accounting/ap/payment-actions/batch-approve
```

Bank submission/callback endpoints ต้องออกแบบร่วมกับ integration owner และไม่ expose secret/account data เกินจำเป็น

## 13. Error cases

- 400 — zero/negative apply amount, mixed vendor/currency, invalid payment date/method
- 403 — ไม่มีสิทธิ์, maker-checker violation, bank account scope หรือผิด workflow assignment
- 409 — `doc_version` conflict, open amount changed, duplicate Submit/Post or approval, payment already posted, cheque no. conflict
- 422 — invalid WHT base/rate, missing verified bank instruction, unavailable rate, period locked, vendor/payment hold
- 424/502/503 — bank/tax/rate/posting dependency failure โดยต้องแยกว่า request ส่งถึงธนาคารแล้วหรือยัง

Frontend ห้ามเสนอ blind retry เมื่อ execution outcome ไม่แน่ชัด ต้อง query status ด้วย idempotency/correlation reference ก่อน

## 14. Acceptance criteria

- เลือก Invoice หลายใบแล้ว proposal แยก PV ถูกต้องตาม BU/vendor/currency/method/bank instruction
- Apply บางส่วนได้และห้ามเกิน available open amount แม้มีผู้ใช้อื่นกำลังจ่ายใบเดียวกัน
- Credit Note/Deposit application ลด cash โดย link posted open item จริง
- WHT คำนวณจาก eligible base และ override เก็บ reason/audit
- Foreign-currency payment สร้าง realized FX ที่ balance ด้วย booking/settlement snapshot
- Workflow ปิด Submit/Post แล้ว Posted ทันที; Workflow เปิด final approval แล้ว Posted ทันที
- Final approval ที่ post สำเร็จทำให้ Invoice paid ตามยอดที่ apply แต่ไม่อ้างว่า bank execution สำเร็จ
- Submit/Post หรือ final approval ที่สำเร็จสร้าง application, open amount, WHT event และ JV เพียงครั้งเดียว
- Posting failure ไม่ mark paid; retry ตรวจ outcome เดิมก่อนส่งซ้ำ
- Batch approve แสดง per-item result และไม่ข้าม SoD/permission/version check
- Reverse payment แล้ว open item กลับมาเฉพาะเมื่อ reversal post สำเร็จ
- Approval view แสดง invoice/PO/GRN/tax/bank/posting evidence และ masked sensitive data
- loading/empty/error/view/edit/read-only/mobile/partial-batch states ทำงานครบ

## 15. Open questions

1. หลัง Posted จะติดตาม bank execution failure และแก้ด้วย reversal/correction flow อย่างไร
2. Phase 1 ต้องสร้าง bank file/API จริงหรือจบที่ PV+manual execution reference
3. Reservation ของ open amount เริ่มตอน Save Draft หรือ Submit และหมดอายุเมื่อใด
4. Cross-currency payment และ bank fee อยู่ใน Phase 1 หรือ deferred
5. Cheque lifecycle/number stock/void/print owner อยู่ใน AP หรือ Cash Management
6. WHT taxable event และ certificate numbering ของแต่ละ BU/jurisdiction คือจุดใด
7. Batch approve/post ต้อง atomic หรือ per-PV และรองรับ partial failure แบบใด
8. Payment approval workflow ใช้ชุดเดียวกับ Invoice หรือ configure แยกตาม amount/method/bank account
