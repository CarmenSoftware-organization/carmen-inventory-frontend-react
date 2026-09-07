# Accounts Payable — Invoice Design

## 1. เป้าหมายและขอบเขต

รองรับการรับและตรวจ Vendor Invoice, คำนวณยอด/ภาษี, match กับ PO/GRN, ผ่าน optional approval, post เป็น AP liability และติดตาม open amount เพื่อส่งต่อให้ Payment

Phase 1 เน้น Standard Invoice ทั้ง PO-based และ non-PO ส่วน Deposit, Debit Note และ Credit Note ใช้ domain model ร่วมกันแต่เปิดตาม release decision ใน [AP Module Design](accounts-payable-design.md)

## 2. Information architecture

```text
/accounting/accounts-payable/invoices
/accounting/accounts-payable/invoices/new
/accounting/accounts-payable/invoices/:id
/accounting/accounts-payable/invoices/:id/edit
```

### Directory columns

| Column | Sort | Filter/search |
| --- | --- | --- |
| Document Type | yes | multi-select |
| AP Doc No. | yes | prefix/range/search |
| Document/Input Date | yes | date range/period |
| Vendor Invoice No. | yes | exact/search |
| Vendor | yes | vendor/code/search |
| Invoice Date | yes | date range |
| Due Date | yes | due horizon/overdue |
| Currency | yes | multi-select |
| Original Amount | yes | amount range |
| Open Amount | yes | amount range |
| Lifecycle | yes | multi-select |
| Settlement | yes | unpaid/partial/paid |
| Match | yes | matched/exception/not applicable |
| Updated | yes | user/date |

List action ตาม context ได้แก่ New Invoice, Pay Selected, approval actions และ export โดยต้องแสดงเฉพาะรายการที่ action ได้จริง

## 3. Invoice header

| Field | Rule |
| --- | --- |
| Document Type | required; `standard_invoice`, `deposit`, `debit_note`, `credit_note` ตาม capability |
| AP Doc No. | backend-generated, read-only, unique ตาม BU/running-code policy |
| Input/Posting Date | required; ใช้ resolve accounting period |
| Vendor | required, active; snapshot legal/tax/payment data ตอน Submit |
| Vendor Invoice No. | required สำหรับ Standard Invoice; unique policy อย่างน้อย BU+vendor+normalized no. |
| Invoice Date | required; ห้ามอยู่อนาคตเกิน policy |
| Payment Term/Credit Days | default จาก vendor แต่ override ได้ตาม permission/reason |
| Due Date | derived จาก invoice date + term; override ได้ตาม policy พร้อม audit |
| Currency | required; default จาก vendor และล็อกหลัง Submit |
| Exchange Rate | 1 และ read-only เมื่อเป็น functional currency; foreign currency resolve ตาม posting date/rate policy |
| Description | required |
| Source | PO/GRN/contract/non-PO reason หรือ original document สำหรับ CN/DN |
| Statuses | read-only composite ของ lifecycle/workflow/settlement/match/tax |

Changing vendor ต้อง re-resolve currency, term, tax profile และ payment defaults แต่ห้ามล้าง line ที่ผู้ใช้แก้แล้วโดยไม่เตือน

## 4. Invoice lines

### Grid columns

- Selection และ line number
- Description/comment
- Unit, quantity และ price per unit
- Subtotal
- Discount profile/amount
- Net amount before tax
- Tax summary
- Total และ open/unpaid amount
- Actions: edit, budget, dimensions และ source-match detail

### Line detail

| Group | Fields/rules |
| --- | --- |
| Expense/asset | posting account, department/cost center, dimensions |
| Quantity/value | unit, quantity, unit price, subtotal |
| Discount | profile, rate/amount, account mapping, department/dimensions; override requires permission+reason |
| VAT | tax profile, taxable base, rate, amount, input/pending VAT account; override requires permission+reason |
| WHT eligibility | service/type/rate/base rule เพื่อส่งต่อ Payment; ไม่ลด AP liability ตอน Invoice เว้นแต่ jurisdiction policy กำหนด |
| AP credit | AP control account จาก vendor/posting rule; UI preview ได้แต่ผู้ใช้ทั่วไปแก้ account ไม่ได้ |

Account, department และ dimensions ต้อง active ณ posting date และผ่าน account-dimension rule

## 5. Amount and rounding rules

คำนวณต่อ line ด้วย decimal arithmetic และ currency precision:

```text
line_subtotal       = quantity × unit_price
line_discount       = profile calculation or approved override
line_net            = line_subtotal - line_discount
line_vat            = tax profile calculation or approved override
line_payable         = line_net + line_vat + other payable taxes
document_total       = sum(line_payable) + header charges - document offsets
open_amount          = posted document total - posted applications - posted credits
```

- WHT เป็นภาษีที่หักตอนชำระ จึงแสดงเป็น eligible/estimated amount แต่ไม่หักจาก Invoice grand total ใน default Thailand policy
- Tax-inclusive profile ต้องย้อน taxable base ด้วย rounding rule ที่กำหนด ไม่ใช้ `amount × 7%` ตรง ๆ ทุกกรณี
- Transaction และ functional totals ต้องแสดงแยกกัน
- Functional amount ปัดต่อ posting line ตาม Accounting Foundation; rounding difference ใช้ configured rounding account เมื่ออยู่ใน tolerance
- Credit Note ใช้ sign convention เดียวใน API และแสดงผลให้ผู้ใช้เข้าใจ ห้ามสลับทั้ง document sign และ debit/credit พร้อมกัน

## 6. PO/GRN and document matching

### Matchable sources

- Purchase Order/contract
- Goods Receipt/Receiving Note
- Service acceptance
- Deposit/Credit Note/Debit Note
- Non-PO reason + approver evidence

### Match result

```text
not_required | pending | matched | variance | overridden
```

ระบบตรวจอย่างน้อย vendor, item/service, quantity, unit price, tax, received quantity, prior invoiced quantity/value และ document currency โดย tolerance มาจาก BU/procurement policy

- 3-way match ใช้ Invoice + PO + GRN; utility/contract/non-PO อาจใช้ 2-way หรือ evidence policy อื่น
- Variance ต้องแสดง expected/actual/difference และ rule ที่ผิด
- Override ต้องมี permission, reason, attachment/evidence ตาม policy และ audit event
- ห้าม Submit เมื่อ match required แต่ยัง pending หรือ variance เกิน toleranceโดยไม่มี approved override
- Reference row ใน mockup ไม่ใช่การแก้ยอดอย่างอิสระ ทุก offset ต้อง link document จริงและห้าม apply เกิน open amount

## 7. Tax invoice

Fields ขั้นต่ำ:

- Tax invoice no./date
- Tax status และ filing period
- Vendor registered name, tax ID, branch และ registered address snapshot
- Tax profile, taxable base, rate, tax amount และ account mapping ต่อ line
- Original attachment/e-tax reference เมื่อ capability พร้อม

Tax states:

```text
pending        # input VAT undue/not ready to claim
confirmed      # valid and claimable
on_review      # incomplete or under audit
filed          # included in filing
unclaimable    # non-refundable/expired/invalid by controlled decision
not_applicable
```

- `filed` record แก้ไม่ได้โดยตรง การแก้ต้องผ่าน tax adjustment/reversal flow
- Filing period ต้อง validate กับ tax invoice date, jurisdiction และ claim deadline
- Vendor tax snapshot เปลี่ยนตาม master ย้อนหลังไม่ได้
- AI/OCR เติมข้อมูลเป็น suggestion พร้อม confidence/provenance; ผู้ใช้ต้อง review field ที่ required

## 8. Posting preview and generated JV

Preview เป็นผลจาก version เดียวกับ backend posting rule ตัวอย่าง:

```text
Dr Expense/Inventory/Asset                 line net
Dr Pending Input VAT or Input VAT          claimable tax
Cr Trade Accounts Payable                  document payable
```

- Preview ต้องแสดง transaction currency, rate และ functional amount
- ผู้ใช้ทั่วไปแก้ generated journal lines ไม่ได้; ต้องแก้ invoice/source แล้ว regenerate ก่อน post
- Generated JV ส่งผ่าน Journal Staging/posting contract และ link กลับ Invoice
- Post Invoice, create open item, tax detail, source links และ posting event ใน transaction เดียวกัน

## 9. Lifecycle, Workflow and actions

### Lifecycle

```text
draft
  -> submitted       (Workflow enabled)
  -> posting         (Workflow disabled)
submitted
  -> draft           (Return/Reject outcome)
  -> posting         (Final approval)
posting
  -> posted
  -> post_failed
posted
  -> partially_paid / paid   (settlement axis, lifecycle remains posted)
  -> reversed                (through linked correction)
draft/submitted/post_failed
  -> voided
```

### Actions

| Action | Allowed state | Notes |
| --- | --- | --- |
| Edit | draft | ownership/permission + `doc_version` |
| Save Draft | draft | shape validation; incomplete match/tax allowed |
| Submit | draft | required fields, duplicate, period, totals, match, tax และ dimensions ผ่าน |
| Approve/Return/Reject | submitted | เฉพาะ Workflow enabled; outcome อยู่ workflow history |
| Retry Post | post_failed | revalidate period/master/rules |
| Copy | visible documents | สร้าง draft ใหม่ ไม่ copy identity, posting, application หรือ workflow |
| Void | draft/submitted/post_failed | reason required; no destructive delete |
| Reverse/Correct | posted | สร้าง linked CN/DN/reversal ตาม nature ของ correction |
| Execute Payment | posted + open amount > 0 | เปิด Payment draft ไม่ post จาก Invoice screen โดยตรง |
| Print/View Attachment/Log | permission-based | read-only ใน posted state |

คำว่า `Save Effective` ใน mockup ให้ตีความเป็น Submit/Post ตาม configuration ห้ามใช้ `effective` เป็นสถานะที่คลุม approval และ posting

## 10. Proposed API surface

ชื่อ endpoint เป็นข้อเสนอและต้อง align กับ backend conventions:

```text
GET    /api/:bu_code/accounting/ap/invoices
POST   /api/:bu_code/accounting/ap/invoices
GET    /api/:bu_code/accounting/ap/invoices/:id
PATCH  /api/:bu_code/accounting/ap/invoices/:id
POST   /api/:bu_code/accounting/ap/invoices/:id/submit
POST   /api/:bu_code/accounting/ap/invoices/:id/approve
POST   /api/:bu_code/accounting/ap/invoices/:id/return
POST   /api/:bu_code/accounting/ap/invoices/:id/reject
POST   /api/:bu_code/accounting/ap/invoices/:id/retry-post
POST   /api/:bu_code/accounting/ap/invoices/:id/void
POST   /api/:bu_code/accounting/ap/invoices/:id/correct
GET    /api/:bu_code/accounting/ap/invoices/:id/activity
GET    /api/:bu_code/accounting/ap/invoices/:id/posting-preview
POST   /api/:bu_code/accounting/ap/invoices/match-preview
POST   /api/:bu_code/accounting/ap/invoices/duplicate-check
GET    /api/:bu_code/accounting/ap/invoices/:id/open-item
```

Action endpoint รับ `doc_version`, reason/comment และ idempotency key ตามความเหมาะสม

## 11. Error cases

- 400 — missing required field, invalid totals/date, application/offset เกินยอด
- 403 — ไม่มีสิทธิ์, maker-checker violation หรือผิด workflow stage
- 409 — `doc_version` conflict, duplicate vendor invoice, period changed/locked, already posted/reversed
- 422 — inactive vendor/account/dimension, unresolved rate, match exception, invalid tax detail
- 424/503 — dependency เช่น PO/GRN, rate, tax, posting หรือ attachment service ไม่พร้อม

Frontend ต้อง map error ไปยัง header/line/tab ที่เกี่ยวข้อง และเก็บ draft ของผู้ใช้ไว้

## 12. Acceptance criteria

- สร้าง draft invoice หลาย lines แล้ว reload ข้อมูลไม่หาย
- Duplicate vendor invoice ถูก block หรือ controlled override ตาม policy
- Due date คำนวณจาก term และ override ถูก audit
- PO invoice แสดง matched/variance พร้อม source PO/GRN และ block Submit เมื่อ exception ยังไม่ resolve
- Non-PO invoice ต้องมี reason/evidence ตาม policy
- VAT inclusive/exclusive, discount, rounding และ document totals ตรงทั้ง transaction/functional currency
- WHT eligibility ไม่ลด default invoice liability ก่อน payment
- Submit เมื่อ Workflow ปิด post โดยไม่สร้าง Approved/Rejected status; เมื่อเปิด final approval จึง post
- Post สร้าง AP open item, tax detail, JV และ ledger เพียงครั้งเดียว
- Partial payment ทำให้ settlement เป็น `partially_paid`; เต็มจำนวนเป็น `paid`
- Posted invoice edit ไม่ได้และ correction link กลับต้นฉบับ
- Tax state/filed period และ vendor tax snapshot ตรวจย้อนหลังได้
- loading/empty/error/view/edit/read-only/mobile states ทำงานครบ

## 13. Open questions

1. Duplicate policy normalize space, dash, leading zero และ tax invoice no. อย่างไร
2. PO/GRN tolerance และ non-PO approval มาจาก service/config ใด
3. Deposit invoice post เป็น AP liability, prepaid asset หรือทั้งสองช่วงอย่างไร
4. Credit Note/Debit Note ต้อง reference original invoice เสมอหรืออนุญาต standalone
5. WHT eligibility จะเก็บต่อ invoice lineหรือ tax line และ lock เมื่อใด
6. Input VAT `confirmed` เกิดตอน invoice approval, receipt of tax document หรือ tax officer action
7. Invoice posting date ใช้ input date หรือมี field แยกจาก document date
