# 13-Week Cash Forecast Design

## เป้าหมายและขอบเขต

สร้าง rolling forecast ใน functional currency ของ BU จาก opening cash, AP outflow, AR inflow, recurring GL cash items และ Asset capex/disposal โดยเป็น decision-support snapshot ไม่สร้างหรือแก้เอกสารบัญชี

## Scenario assumptions

| Scenario | AR collections                                       | Committed outflow                 |
| -------- | ---------------------------------------------------- | --------------------------------- |
| Base     | รับตาม expected date และ collection assumptions ปกติ | จ่ายตาม due/approved schedule     |
| Best     | collection rate สูงขึ้นและรับเร็วขึ้น                | committed payment ไม่ถูกซ่อน      |
| Worst    | collection rate ลดลงและรับล่าช้า                     | committed payment ยังเกิดตามกำหนด |

Assumption ทุกชุดต้องมี version, description และ generated time

## Weekly model

แต่ละสัปดาห์เก็บ opening balance, inflow แยก AR/GL/Asset, outflow แยก AP/GL/Asset และ closing balance โดย:

`closing = opening + total inflow - total outflow`

Closing ของสัปดาห์ก่อนต้องเป็น opening ของสัปดาห์ถัดไป Forecast แสดง opening cash, total inflow, total outflow, lowest projected balance และสัปดาห์ที่ต่ำสุด

## Proposed API

`GET /api/accounting/{bu}/cash-forecast?as_of={date}&horizon_weeks=13&scenario={base|best|worst}&currency={code}`

Response ต้องมี weeks, sources, assumptions, completeness, confidence, generated_at, exchange-rate snapshot และ widget errors Cache key ต้องรวม BU, user permission scope, as-of, scenario และ assumptions version

## Drill-down and reconciliation

- AP ไป Payment/Invoice ด้วย source week และ due filters
- AR ไป Invoice/Receipt ด้วย expected collection week
- GL ไป recurring voucher/source journal
- Asset ไป register/disposal record
- Opening balance reconcile กับ GL cash/bank accounts ณ as-of
- Source totals reconcile กับ weekly inflow/outflow ก่อนคำนวณ closing

## Failure and confidence

Missing source, stale FX หรือ incomplete schedule ต้องลด completeness/confidence และแสดง warning เฉพาะส่วน ห้ามแทนค่าที่หายด้วยศูนย์โดยไม่แจ้ง ผู้ใช้ต้องเห็นว่า forecast เป็นประมาณการและตรวจ assumptions ได้จากหน้าเดียวกัน
