# Accounting Dashboard Framework

## เป้าหมาย

กำหนด pattern ร่วมของ Dashboard สำหรับ General Ledger, Accounts Payable, Accounts Receivable และ Asset ให้รองรับทั้งงานประจำวันและการบริหาร โดยทุกยอดรักษา BU, period, as-of date, currency และ permission scope เดียวกับรายการต้นทาง

## Audience views

| View        | ผู้ใช้หลัก                    | จุดนำสายตา                                                  |
| ----------- | ----------------------------- | ----------------------------------------------------------- |
| Operational | Accountant และ module officer | งานค้าง, exception, approval, reconciliation และ drill-down |
| Management  | Controller และ Executive      | KPI, trend, concentration, liquidity และ risk               |

ผู้ใช้ที่มีสิทธิ์ทั้งสอง view เห็น Tabs และสลับได้ Controller เปิด Operational เป็นค่าเริ่มต้นเพื่อไม่พลาดงานค้าง ส่วน Executive เปิด Management เป็นค่าเริ่มต้น

### Development Role Preview

Mockup รองรับ `preview_role=accountant|controller|executive` ใน query string:

- Accountant: Operational เท่านั้น
- Controller: Operational และ Management
- Executive: Management เท่านั้น

Preview เป็นเครื่องมือ development และต้องไม่แทน permission enforcement ฝั่ง backend

## Permission contract

แต่ละ module เสนอ permission `<module>.dashboard.operational` และ `<module>.dashboard.management` โดย API aggregate ต้อง scope ข้อมูลก่อนคำนวณ ห้ามส่งข้อมูลเกินสิทธิ์แล้วค่อยซ่อนใน UI

## Shared page structure

1. Header: ชื่อ module, คำอธิบายสั้น, as-of/period, refresh และ freshness
2. Audience Tabs และ development role preview
3. Summary: KPI สำคัญ 3–5 ค่า พร้อมหน่วย เวลาอ้างอิง และ delta ที่มีฐานเปรียบเทียบ
4. Analysis: กราฟที่ตอบคำถามเฉพาะ module
5. Action/exception queue หรือ management risks
6. Reconciliation และ data-quality footer

สีใช้แบบ restrained: Carmen Blue สำหรับ action/selection, teal สำหรับ inflow/success, amber สำหรับ due/committed, red สำหรับ overdue/failure และ neutral สำหรับโครงสร้าง กราฟต้องมี label, tooltip และ text summary

## Shared states

- Loading ใช้ skeleton ที่รักษา layout
- Empty แยก no activity, no result และ no permission
- Partial failure ปิดเฉพาะ widget ที่เสีย พร้อม retry และ timestamp
- Stale data แสดง warning และ generated time
- Mobile เรียง urgent action ก่อน analysis; chart มีตาราง/summary ที่อ่านแทนได้
- ทุก interactive card ใช้ button/link จริงและมี focus state

## Drill-down rules

ทุก KPI, bucket และ chart point ที่ actionable ต้องส่ง `as_of`, period, audience context และ domain filter ไป route ปลายทาง ยอดรวมของปลายทางต้อง reconcile กับจุดที่กดภายใต้ permission scope เดียวกัน
