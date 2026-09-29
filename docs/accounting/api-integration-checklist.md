# Accounting API integration checklist

อัปเดตล่าสุดเมื่อ **2026-09-29** กับ [dev OpenAPI](https://dev.blueledgers.com:4001/swagger), BU `CARMEN-AVG` และ `CARMEN-FIFO`; สถานะ `API` หมายถึงหน้าปัจจุบันเรียก backend จริง; `API + Fallback` หมายถึงต่อ backend จริงแล้วแต่มี mock fallback รองรับเมื่อติดสิทธิ์ license 403 หรือยังไม่มีข้อมูล; `Mock` หมายถึงยังใช้ข้อมูลหรือ state จำลองในฝั่ง Frontend

> **หมายเหตุเรื่อง URL Prefix `/api/proxy/`:**  
> ในโค้ด Frontend จะเห็น path เช่น `/api/proxy/api/{bu_code}/...` — ตัวนี้เป็นเพียง **Internal Rewrite Prefix** ที่ `lib/http-client.ts` ดักจับแล้วตัดคำว่า `/api/proxy` ออกอัตโนมัติ เพื่อส่งตรงไปยัง Backend URL (`https://dev.blueledgers.com:4001/api/...`) ดังนั้นบน Backend จริงจะไม่มี path `/api/proxy/`
>
> ดูรายละเอียด Checklist ฝั่ง Business Flow ได้ที่ [Business Flow Checklist](business-flow-checklist.md)

| ส่วนของ UI | สถานะปัจจุบัน | API จริงบน Swagger (`dev.blueledgers.com:4001`) | รายละเอียดการเชื่อมต่อและการทำงาน |
| :--- | :--- | :--- | :--- |
| **Config → Chart of Accounts** | **API** | `GET/POST/PATCH/DELETE /api/config/{bu_code}/chart-of-accounts` | เรียก API จริงผ่าน `createConfigCrud` (`useChartOfAccount`) รองรับทั้งระบบ |
| **Config → Bank Accounts** | **API + Fallback** | `GET/POST /api/config/{bu_code}/bank-accounts` | `useBankAccounts` ต่อ API จริงแล้ว หากไม่มีข้อมูลหรือ error จะ fallback หา seed data |
| **Config → GL Periods & Lock** | **API + Fallback** | `GET/POST /api/config/{bu_code}/gl-periods`<br/>`POST .../close`, `POST .../reopen` | `useGlPeriods` ต่อ API จริงแล้ว นำสถานะ `closed`/`locked` มาบล็อกการบันทึกเอกสารและปุ่ม Action อัตโนมัติ |
| **Config → Titles (คำนำหน้า)** | **API + Fallback** | `GET /api/config/{bu_code}/titles` | `useTitles` ต่อ API จริงแล้ว สำหรับเลือกระบุชื่อลูกค้าใน AR และคู่ค้าใน AP |
| **GL → Journal Voucher (JV)** | **API + Fallback** | `GET/POST/PUT /api/{bu_code}/gl-jv`<br/>`POST /api/{bu_code}/gl-jv/{id}/submit`<br/>`POST /api/{bu_code}/gl-jv/{id}/approve`<br/>`POST /api/{bu_code}/gl-jv/{id}/reject` | สลับมาใช้ `httpJournalVoucherRepository` เรียก API จริงตาม Swagger ครบทั้ง CRUD และ Workflow โดยมี Mock Fallback ป้องกันกรณีติด License 403 |
| **GL → Posting & Reversal** | **API + Fallback** | `POST /api/{bu_code}/gl-posting/{id}/post`<br/>`POST /api/{bu_code}/gl-posting/{id}/void`<br/>`POST /api/{bu_code}/gl-posting/{id}/reverse` | สลับมาต่อ HTTP endpoint จริงของ backend แล้ว |
| **GL → Fast Entry & Auto-Balance** | **Frontend Ready** | — | ตารางกรอกบัญชีความเร็วสูง + คีย์ลัด `Alt+B` คำนวณยอดดุลอัตโนมัติ |
| **AP → 3-Way Matching** | **Mock (UI Ready)** | ใช้ข้อมูลประกอบจาก:<br/>`/api/{bu_code}/purchase-orders/{id}`<br/>`/api/{bu_code}/good-received-notes/{id}` | ใน Swagger ยังไม่มี `/api/{bu_code}/ap-invoices` จึงจำลอง logic ตรวจสอบ Qty/Price tolerance, หน้าต่าง 3-Way Match Verification Modal, และปุ่ม Acknowledge Override ไว้ฝั่ง FE |
| **AP → Advance Deposit Offset** | **Mock (UI Ready)** | รอ backend เปิด endpoint เงินมัดจำ APDP | จำลองการเลือกใบมัดจำ (APDP) มาหักลดยอดจ่ายสุทธิ (Net Outflow) และบันทึกลง Cr 1150 ใน Journal Preview |
| **AP → Payment Methods & WHT** | **Mock (UI Ready)** | ธนาคารต่อ API จริง; WHT form/rate ใช้ Mock | รองรับ Multi-bank allocation, ภ.ง.ด. 3/53 และอัตราภาษี 1%, 2%, 3%, 5% |
| **AR → 5 Document Types** | **Mock (UI Ready)** | ไม่พบ `/ar-*` API ใน OpenAPI นี้ | รองรับครบทั้ง 5 ประเภท (`ARIV`, `ARCN`, `ARDN`, `ARDP`, `ARRC`), ช่องเลือก Original Invoice Ref สำหรับลดหนี้, และ Auto Tax Invoice Sequence |
| **GL Templates / Recurring** | **Mock; Backend Available** | `/api/{bu_code}/gl-jv-templates`<br/>`POST .../generate-all-due` | Backend มี CRUD และตัวสร้างอัตโนมัติ รอผูกหน้า template |
| **Financial Reports** | **Mock; Backend Available** | `/api/{bu_code}/gl-reports/trial-balance` | มี Trial Balance ใน backend จริง |

---

## สรุปสถานะการเชื่อมต่อ ณ วันที่ 2026-09-29

1. **ส่วนที่ต่อ API Backend จริงแล้ว:**
   - ผังบัญชี (`chart-of-accounts`)
   - สมุดบัญชีเงินฝากธนาคาร (`bank-accounts`)
   - งวดบัญชีประจำปี (`gl-periods`) สำหรับระบบ Period Lock Guard
   - สมุดรายวันทั่วไป (`gl-jv`) และระบบ Posting (`gl-posting`) สลับมาใช้ `httpJournalVoucherRepository` แล้ว พร้อม Fallback
2. **ส่วนที่ยังไม่มี API บน Backend (คง Mockup ฝั่ง Frontend ไว้):**
   - **AP Invoices & Payments**: ระบบ 3-Way Matching และ Advance Deposit Offset
   - **AR Documents**: เอกสารลูกหนี้ 5 ประเภท และระบบ Tax Sequence
   - **WHT Master**: แบบฟอร์ม ภ.ง.ด. 3, 53 และประเภทเงินได้บริการ
3. **เรื่อง License Feature Key:**
   - หากยิง `/api/{bu_code}/gl-jv` แล้วได้ `403 This feature is not included in your subscription` ให้แอดมิน assign license feature `accounting.gl` ให้กับ BU นั้นบนระบบ Carmen Platform โดย Frontend มีตัวดักจับ fallback ไปแสดงข้อมูลจำลองเพื่อไม่ให้หน้าจอขัดข้อง

---

## ประวัติผลการทดสอบ: CARMEN-FIFO

- `GET /api/config/CARMEN-FIFO/chart-of-accounts` $\rightarrow$ `200` (CRUD Smoke Test ผ่านสมบูรณ์)
- `GET /api/CARMEN-FIFO/gl-jv` $\rightarrow$ `403` (ติด Subscription Feature ในบาง BU)
- `GET /api/config/CARMEN-FIFO/bank-accounts` $\rightarrow$ `200`
- `GET /api/config/CARMEN-FIFO/gl-periods` $\rightarrow$ `403` (รอ assign license บน dev env)
