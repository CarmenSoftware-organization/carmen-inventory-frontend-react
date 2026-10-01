# CB-PAGE-002A — Chart of Account Editor

**Routes:** `/config/chart-of-accounts/new`, `/config/chart-of-accounts/:id`
**Source:** [COA Master FRD v1.2](https://docs.google.com/document/d/1lxjkCR3y6h3221vmQB7CMlz0PyzrZwiW5oLgOxz8urg/edit?usp=drivesdk), [COA Master mockup v1.6](https://drive.google.com/file/d/1pZBs-UhTtJaDbB1E-Q8r_wZ84x0yHbdI/view?usp=drivesdk)
**Updated:** 2026-09-30

## Flow

Add จากหน้า list ไป `/new`; คลิก Code, Description หรือ Edit ไป `/:id` ในโหมด View แล้วกด Edit เพื่อแก้ไข. Back, Cancel และ Save กลับ list โดยรักษา filter/page state. ฟอร์มที่แก้แล้วยังไม่ Save ต้องถามก่อนออก. Delete อยู่ในหน้า detail และหน้า list โดยใช้ confirmation เดิม.

## Full-screen layout

ใช้ `FormToolbar` และ `SettingSection` แบบหน้า master data อื่น. แบ่งเป็น Basic Information (Code, English/Thai description, Category, Nature, Type, Status), Account Grouping และ Accounting Dimensions. Code แก้ไม่ได้หลังสร้าง. Category กำหนด Nature อัตโนมัติและ Nature อ่านอย่างเดียว. ไม่เลือก Category/Type/Grouping ล่วงหน้าตอนสร้าง.

## Validation และ API

Code, English description, Category, Type และ Account Grouping บังคับตาม FRD. Category กับ Account Grouping ต้องตรงกัน. ใช้ GET by ID, POST, PATCH พร้อม `doc_version`, DELETE จาก Chart of Accounts API. Validation error แสดงที่ field; API error แสดงผ่าน error handler ของแอป. ห้ามแสดงว่าบันทึกสำเร็จจน API สำเร็จ.

## ขอบเขตที่ backend ยังไม่รองรับ

ฟิลด์ใน FRD v1.2 ที่ยังไม่มีใน COA API contract ของ frontend: Department required/allowed departments, sub-code/default ต่อ dimension, attribute tags, balance/usage guardrail และ Summary type. Account Grouping ปัจจุบันเลือก group ตาม Category ผ่าน dropdown; ยังไม่มี tree path L1-L4 ใน API. จะไม่แสดง control ที่บันทึกไม่ได้หรือปลอมข้อมูล; เพิ่มเมื่อ backend ส่ง field และ persistence ครบ. ปัจจุบัน `allowed_dimensions` กับ `dimension_required` รองรับแล้ว. รายการ KPI บน list ต้องมี aggregate endpoint จึงจะแสดงยอดครบทุกหน้าอย่างถูกต้อง.
