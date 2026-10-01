# CB-PAGE-002 — Chart of Accounts List

**Route:** `/config/chart-of-accounts`
**Updated:** 2026-09-30
**Source:** [COA Master FRD v1.2](https://docs.google.com/document/d/1lxjkCR3y6h3221vmQB7CMlz0PyzrZwiW5oLgOxz8urg/edit?usp=drivesdk), [COA Master mockup v1.6](https://drive.google.com/file/d/1pZBs-UhTtJaDbB1E-Q8r_wZ84x0yHbdI/view?usp=drivesdk)

## Purpose และ navigation

รายการรหัสบัญชีของ BU ปัจจุบัน ใช้ค้นหา กรอง export, import จาก Carmen GL, เปิดดู และลบ. **Add Account** ไป `/config/chart-of-accounts/new`; คลิก Code หรือการ์ดไป `/config/chart-of-accounts/:id` ในโหมด View. ดูฟอร์มที่ [CB-PAGE-002A](CB-PAGE-002A-chart-of-account-editor.md). ไม่มี Add/Edit dialog แล้ว. การกลับจากฟอร์มรักษา state ของ list.

## UI และ API ปัจจุบัน

ใช้ `ConfigListTemplate` ร่วมกับหน้า Configuration อื่น. มี search, saved views, filter, table/grid, pagination, export และ delete confirmation. Table แสดง Code, Account name, Description, Nature, Type, Account Group, Status และ audit columns. Grid card แสดงข้อมูลหลัก. Filter ปัจจุบัน: Status, Nature, Type. อ่านข้อมูลด้วย GET `/api/config/{bu_code}/chart-of-accounts`; ลบด้วย DELETE `.../{id}`. Import ใช้ CB-MODAL-002.

`canWrite` ของ license ปิด Add, Delete, Import และการแก้ไขในหน้า detail; backend บังคับ RBAC และข้อมูล. Error ของ list มี Retry. Delete แสดง confirmation และ reload list หลังสำเร็จ.

## ความต่างจาก FRD v1.2 / mockup v1.6

| ข้อกำหนด | สถานะ UI | เหตุผล / งานที่ต้องมี |
|---|---|---|
| Full-screen editor | ใช้แล้ว | CB-PAGE-002A |
| Category filter, Req Dept/Req Dim filter | ยังไม่มี | ต้องยืนยัน filter contract ของ API |
| KPI 5 cards ทั้งรายการ | ยังไม่มี | API list แบบ pagination ไม่มี aggregate count สำหรับทุกสถานะ |
| D/C badge และ 2-line table headers | ยังไม่มี | ปรับได้ใน UI หลังตรวจ table convention |
| Delete guardrail สำหรับ used/balance | Backend ต้องบังคับ | response ของ COA ปัจจุบันไม่มี usage/balance ให้ frontend ประเมิน |

## เอกสารที่เกี่ยวข้อง

- [CB-PAGE-002A — Chart of Account Editor](CB-PAGE-002A-chart-of-account-editor.md)
- [CB-MODAL-002 — Import from Carmen GL](../modals/CB-MODAL-002-import-carmen-gl.md)
- [CB-MODAL-014 — Delete Confirmation](../modals/CB-MODAL-014-delete-confirm.md)
