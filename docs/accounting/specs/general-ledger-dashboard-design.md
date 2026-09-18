# General Ledger Dashboard Design

> Implementation note (2026-09-11): Dashboard ต้องอ่าน canonical Posting Event/Ledger/Reconciliation read model และห้ามใช้ mock fallback เป็น production value ดู [GL Implementation Readiness](general-ledger-implementation-readiness.md)

## Operational view

- KPI: Unposted JV, Posting failures, Scheduled today และ Auto-reversals due
- Posting health: สัดส่วน draft/submitted/scheduled/posted/failed
- Subledger posting backlog แยก AP, AR, Inventory และ Asset พร้อม oldest event age
- Journal Staging exceptions, source events ที่ยังไม่สร้าง JV และ source-to-JV trace coverage
- Period-close readiness: checklist พร้อม owner และ due state
- Action queue: posting error, unbalanced interface batch, reversal และ accrual review
- Reconciliation: total debit/credit, subledger control accounts และ variance
- AP control-account reconciliation พร้อม manual-posting/orphan/reversal exceptions

Drill-down ใช้ `/accounting/journal-voucher` พร้อม status/date filters และ `/accounting/financial-reports` สำหรับ reconciliation detail

## Management view

- KPI: Revenue, Expense, Operating result และ Cash/Bank balance
- P&L trend 6 เดือน และ expense composition
- Financial position: Assets, Liabilities และ Equity
- Consolidated 13-week Cash Forecast ตาม [Cash Forecast Design](cash-forecast-design.md)

## Acceptance

- Operational ไม่แสดง AP/AR/Asset KPI ที่ไม่มีบริบท GL
- Debit และ credit reconcile; variance ต้องเห็นเด่นเมื่อไม่เป็นศูนย์
- Management KPI ระบุ period, comparative period และ functional currency
- Forecast ไม่เปลี่ยน journal หรือ posting state
- AP control-account balance reconcile กับ posted AP open items/payment clearing ตาม policy หรือแสดง actionable variance
- Partial dependency failure แสดง widget timestamp/error โดยไม่แทนค่าด้วย mock
