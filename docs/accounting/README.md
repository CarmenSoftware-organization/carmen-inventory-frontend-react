# Carmen Accounting

เอกสารชุดนี้กำหนดฐานของโมดูล Accounting ที่จะทำงานร่วมกับ Carmen Inventory โดยไม่สร้าง master data และ infrastructure ซ้ำโดยไม่จำเป็น

> สถานะ: Draft v0.1 — ใช้สำหรับยืนยัน domain, business rules และขอบเขตก่อนออกแบบ API/schema และเริ่ม implementation

## เอกสาร

| เอกสาร | เนื้อหา |
| --- | --- |
| [Accounting Foundation](accounting-foundation.md) | ขอบเขต Accounting, shared services, domain model, posting engine, period/currency rules และ integration contract |
| [General Ledger — Journal Voucher](specs/general-ledger-journal-voucher-design.md) | Functional design ของ GL/JV รวม Schedule Post และ Auto-Reverse |

## ลำดับการส่งมอบ

1. Accounting Foundation — shared master data, Chart of Accounts, periods, dimensions, posting engine และ audit contract
2. General Ledger — Journal Voucher
3. General Ledger — Template/Recurring/Allocation Voucher
4. General Ledger — Trial Balance, Account Ledger และ Financial Statements
5. Accounts Payable
6. Accounts Receivable
7. Fixed Assets

AP, AR และ Fixed Assets ต้องส่งรายการเข้า GL ผ่าน posting contract เดียวกัน ห้ามเขียน journal tables โดยตรง

## ขอบเขตของ repository

Repository นี้เป็น Vite/React SPA และไม่มี application server ดังนั้น:

- UI, route, validation ฝั่งผู้ใช้ และการเรียก API อยู่ใน repository นี้
- การสร้างเลขเอกสาร, approval, posting, scheduled jobs, auto-reversal, period locking และ transaction integrity ต้องทำใน backend
- งาน scheduler ต้องทำแบบ idempotent และใช้ distributed lock ตาม operational pattern ของ Carmen
- เอกสารนี้ยังไม่ตัดสินว่า Accounting backend จะอยู่ใน `micro-business` หรือแยก service ใหม่ การตัดสินใจนั้นต้องทำก่อนเริ่ม schema/API

## หลักการ

- Reuse master data และ infrastructure ที่มีอยู่ เมื่อ semantics ตรงกัน
- Extend service เดิมเมื่อข้อมูลเดิมถูกต้องแต่ยังไม่พอสำหรับบัญชี
- Accounting เป็นเจ้าของ ledger, posting state, rate snapshot และการปิดงวด
- รายการที่ post แล้วแก้ไม่ได้ การแก้ต้องทำผ่าน reversal หรือ adjusting journal
- ทุกยอดต้องอธิบายย้อนกลับถึง source document, ผู้ทำรายการ, approval และ posting event ได้
- Journal Staging validation ทำงานภายในเสมอ แต่ default `standard` mode ซ่อนเมนูและ auto-generate JV; `strict` mode จึงแสดง Workbench และเพิ่ม manual release gate
