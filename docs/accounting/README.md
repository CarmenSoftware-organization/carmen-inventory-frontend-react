# Carmen Accounting

เอกสารชุดนี้กำหนดฐานของโมดูล Accounting ที่จะทำงานร่วมกับ Carmen Inventory โดยไม่สร้าง master data และ infrastructure ซ้ำโดยไม่จำเป็น

> สถานะ: Phase 1 implementation (dev2) — Foundation และ General Ledger/JV มี schema, RPC/HTTP contract และ UI เริ่มต้นแล้ว; migration/runtime deployment และ Strict Staging Workbench ยังเป็นงานถัดไป

## เอกสาร

| เอกสาร | เนื้อหา |
| --- | --- |
| [Accounting Foundation](accounting-foundation.md) | ขอบเขต Accounting, shared services, domain model, posting engine, period/currency rules และ integration contract |
| [General Ledger — Journal Voucher](specs/general-ledger-journal-voucher-design.md) | Functional design ของ GL/JV รวม Schedule Post และ Auto-Reverse |
| [Phase 1 Runbook](phase1-runbook.md) | ขั้นตอน migration, smoke test และ verification สำหรับ dev2 |

## ลำดับการส่งมอบ

1. Accounting Foundation — shared master data, Chart of Accounts, periods, dimensions, posting engine และ audit contract
2. General Ledger — Journal Voucher
3. General Ledger — Template/Recurring/Allocation Voucher
4. General Ledger — Trial Balance, Account Ledger และ Financial Statements
5. Accounts Payable
6. Accounts Receivable
7. Fixed Assets

AP, AR และ Fixed Assets ต้องส่งรายการเข้า GL ผ่าน posting contract เดียวกัน ห้ามเขียน journal tables โดยตรง

## Implementation decision (Phase 1)

- Accounting Journal Voucher backend อยู่ใน `apps/micro-business` และเปิดผ่าน `apps/backend-gateway`
- Frontend route หลักคือ `/accounting/journal-voucher`
- Workflow เป็น optional ต่อ BU; เมื่อปิดจะไม่สร้างสถานะ approval ที่ไม่จำเป็น
- Journal Staging ยังคงเป็น technical boundary ตาม Foundation โดย default `standard`; Phase 1 มี Batch/Record API, process validation และ Generate JV endpoint/Workbench ขั้นต้นแล้ว ส่วน normalize/mapping/release worker แบบเต็มจะส่งมอบใน increment ถัดไป

## ขอบเขตของ repository

Repository นี้เป็น Vite/React SPA และไม่มี application server ดังนั้น:

- UI, route, validation ฝั่งผู้ใช้ และการเรียก API อยู่ใน repository นี้
- การสร้างเลขเอกสาร, approval, posting, scheduled jobs, auto-reversal, period locking และ transaction integrity ต้องทำใน backend
- งาน scheduler ต้องทำแบบ idempotent และใช้ distributed lock ตาม operational pattern ของ Carmen
- Phase 1 ใช้ `micro-business` เป็น owner ของ Accounting backend และ `backend-gateway` เป็น HTTP boundary; การแยก service เป็นการตัดสินใจเชิงสถาปัตยกรรมในอนาคตเมื่อปริมาณงานต้องการ

## หลักการ

- Reuse master data และ infrastructure ที่มีอยู่ เมื่อ semantics ตรงกัน
- Extend service เดิมเมื่อข้อมูลเดิมถูกต้องแต่ยังไม่พอสำหรับบัญชี
- Accounting เป็นเจ้าของ ledger, posting state, rate snapshot และการปิดงวด
- รายการที่ post แล้วแก้ไม่ได้ การแก้ต้องทำผ่าน reversal หรือ adjusting journal
- ทุกยอดต้องอธิบายย้อนกลับถึง source document, ผู้ทำรายการ, approval และ posting event ได้
- Journal Staging validation ทำงานภายในเสมอ แต่ default `standard` mode ซ่อนเมนูและ auto-generate JV; `strict` mode จึงแสดง Workbench และเพิ่ม manual release gate
