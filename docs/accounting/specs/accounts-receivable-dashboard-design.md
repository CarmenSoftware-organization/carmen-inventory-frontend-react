# Accounts Receivable Dashboard Design

## Operational view

- KPI: Total AR Outstanding, Overdue, Unapplied receipts และ Pending approvals
- AR Aging: Not due, Due today, 1–30, 31–60, 61–90 และ 90+ days
- Collection queue: ลูกค้าที่ต้องติดตาม เรียงตาม overdue severity
- Reconciliation: AR aging เทียบ control account และ receipt allocation

Drill-down ใช้ `/accounting/accounts-receivable/invoice` และ `/accounting/accounts-receivable/receipt` พร้อม as-of, aging และ customer filters

## Management view

- KPI: DSO, Overdue ratio, Collection effectiveness และ Cash collected
- Receivable versus collection trend
- Customer concentration และ aging mix
- 13-week expected collection contribution พร้อม Base/Best/Worst assumptions

## Acceptance

- Outstanding รวมเฉพาะ posted open items
- Unapplied receipt ไม่ถูกนับลด AR ก่อน allocation post
- DSO และ collection effectiveness แสดงสูตรและช่วงเวลาที่ใช้
- Forecast collection แยกจาก contractual receivable balance
