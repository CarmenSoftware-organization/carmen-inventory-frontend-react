# Carmen Accounting

คำศัพท์กลางของบริบท Accounting สำหรับ General Ledger และ subledgers ที่ส่งรายการเข้าบัญชี เพื่อให้เอกสารและระบบใช้ความหมายเดียวกัน

## Language

**Journal Batch**:
ชุดนำเข้าหรือชุดสร้างรายการที่ประกอบด้วย Journal Voucher ตั้งแต่หนึ่งใบขึ้นไป และติดตามการตรวจสอบหรือประมวลผลเป็นกลุ่มได้
_Avoid_: Import file, Excel batch, bulk JV

**Journal Voucher**:
เอกสารบัญชีหนึ่งใบที่เป็นหน่วย atomic ประกอบด้วย Journal Lines ตั้งแต่สองบรรทัดขึ้นไป และต้องสมดุลก่อน post
_Avoid_: Transaction, batch, journal row

**Journal Line**:
รายการเดบิตหรือเครดิตหนึ่งบรรทัดภายใน Journal Voucher ซึ่งอ้างถึงบัญชี จำนวนเงิน และมิติทางบัญชี
_Avoid_: JV transaction, record, item

**Journal Group Key**:
รหัสจากแหล่งข้อมูลหรือกฎ mapping ที่ระบุว่า Journal Lines ใดใน Journal Batch ต้องรวมเป็น Journal Voucher ใบเดียวกัน
_Avoid_: Sheet name, row group, voucher guess

**Per-Journal Processing**:
นโยบายที่ประมวลผล Journal Voucher แต่ละใบใน Journal Batch เป็นอิสระ โดยใบที่ผ่านเดินหน้าต่อได้และใบที่ผิดค้างให้แก้หรือ retry
_Avoid_: Partial row posting, best-effort posting

**Journal Staging**:
ขอบเขตภายในที่รับ Accounting Events เพื่อจัดกลุ่ม ตรวจ mapping ตรวจความถูกต้อง และป้องกันข้อมูลซ้ำก่อนสร้าง Journal Voucher โดยจะแสดงเป็นเมนูให้ผู้ใช้จัดการเฉพาะเมื่อเปิด Strict Staging
_Avoid_: Optional validation, direct ledger posting, Excel buffer

**Journal Staging Mode**:
การตั้งค่าต่อ Business Unit ที่เลือก `standard` เพื่อซ่อน Staging และสร้าง JV อัตโนมัติหลังตรวจผ่าน หรือ `strict` เพื่อแสดง Workbench และให้ผู้ใช้ release รายการที่ตรวจผ่านก่อนสร้าง JV
_Avoid_: Bypass validation, workflow mode

**Original Payload**:
ข้อมูลต้นฉบับที่ Journal Staging รับจาก source และเก็บแบบแก้ไขไม่ได้เพื่อใช้ตรวจสอบเทียบกับ mapped หรือ overridden values
_Avoid_: Editable import data, current row values

**Mapping Override**:
ค่าทางบัญชีที่ผู้มีสิทธิ์กำหนดแทนผลจาก Mapping Rule สำหรับ staged JV โดยไม่แก้ Original Payload และต้องระบุเหตุผล
_Avoid_: Fix source data, silent correction

**Bulk Command**:
คำสั่ง Submit, Approve หรือ Post ที่ผู้ใช้ส่งให้ Journal Vouchers หลายใบพร้อมกัน โดยระบบยังตรวจและบันทึกผลแยกต่อใบตาม Per-Journal Processing
_Avoid_: Batch transaction, all-or-nothing posting

**Ingestion Correlation**:
รหัสที่เชื่อม Journal Batches หลายชุดซึ่งเกิดจาก payload หรือการนำเข้าครั้งเดียวกัน โดยไม่ทำให้ Batch ข้าม Business Unit
_Avoid_: Cross-BU batch, shared batch number

**Batch Accounting Period**:
งวดบัญชีเดียวที่ครอบ Journal Voucher ทุกใบใน Journal Batch โดยแต่ละใบมี Journal Date ต่างกันได้เมื่อยังอยู่ภายในงวดเดียวกัน
_Avoid_: Import month label, mixed-period batch

**Functional Amount**:
ยอดของ Journal Line ที่แปลงและปัดตาม precision ของ functional currency ประจำ Business Unit และใช้เป็นฐานตรวจสมดุลกับลง ledger
_Avoid_: Display amount, unrounded converted amount

**Rounding Adjustment**:
Journal Line ที่แสดงผลต่างจากการปัดสกุลเงินอย่างชัดเจนและลงบัญชี rounding ที่กำหนด เมื่อผลต่างไม่เกิน tolerance ของ Business Unit
_Avoid_: Hidden balance fix, floating-point correction

**Exact Duplicate**:
Accounting Event ที่มี source identity, version, event type หรือ idempotency key ตรงกับ event ที่ระบบเคยรับแล้วและต้องไม่สร้าง JV ซ้ำ
_Avoid_: Similar journal, repeated amount

**Probable Duplicate**:
Staged JV ที่มี fingerprint ทางบัญชีคล้ายรายการเดิมและต้องให้ผู้ใช้ตรวจหรือยืนยันเหตุผล แต่ไม่ถูก block โดยอัตโนมัติ
_Avoid_: Exact duplicate, guaranteed duplicate

**Declared Control Totals**:
จำนวน records และยอดแยกสกุลเงินที่ source ระบุเพื่อใช้ยืนยันความครบถ้วนของ Journal Batch
_Avoid_: Carmen-calculated balance, functional total

**Computed Control Totals**:
จำนวนและยอดที่ Carmen คำนวณจากข้อมูลที่รับ, จัดกลุ่ม, map, generate และ post เพื่อ reconcile กับ source และแต่ละขั้นของ Batch
_Avoid_: Source totals, user-entered expected amount

**Staging Attempt**:
รอบการประมวลผล Journal Batch แบบ asynchronous ที่เก็บผล grouping, mapping, validation และ reconciliation แยกจากรอบก่อนหน้า
_Avoid_: Page request, overwritten retry

**Batch-Generated Journal Voucher**:
Journal Voucher ที่เป็น immutable projection จาก Journal Staging และต้องแก้ข้อมูลบัญชีโดยกลับไปแก้ staging/mapping แล้ว regenerate
_Avoid_: Editable imported JV, detached journal

**Draft Reference**:
รหัสติดตามชั่วคราวของ staged/generated JV ก่อน Submit ซึ่งไม่ใช่เลขเอกสารบัญชีทางการ
_Avoid_: Voucher number, running code

**Mapping Snapshot**:
สำเนาและ hash ภายในของ Mapping Rule ที่ Staging Attempt ใช้ เพื่ออธิบายผล mapping ย้อนหลังโดยไม่เป็น business version ที่ผู้ใช้ต้องจัดการ
_Avoid_: Approved mapping version, editable rule reference

**Optional Workflow**:
การตั้งค่าต่อ Business Unit และ journal type ที่เลือกว่าจะใช้ approval stages ก่อนลง ledger หรือให้ Submit ไปสู่ Posting/Scheduled โดยตรง
_Avoid_: Mandatory approval, JV approved status
