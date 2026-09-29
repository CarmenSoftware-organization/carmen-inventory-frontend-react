# Asset Dashboard Design

## Operational view

- KPI: Registered assets, Pending capitalization, Depreciation due/failed และ Pending disposals
- Depreciation-run progress ตาม asset class
- Data-quality queue: missing useful life, cost center, serial number และ custodian
- Reconciliation: Asset subledger เทียบ fixed-asset และ accumulated-depreciation accounts

Drill-down ใช้ `/accounting/asset/register` และ `/accounting/asset/disposal` พร้อม status, class และ period filters

## Management view

- KPI: Gross cost, Accumulated depreciation, Net book value และ Capex/Disposals YTD
- NBV/depreciation trend, asset-class mix และ asset-age profile
- 13-week Capex outflow และ disposal-proceeds contribution

## Acceptance

- Depreciation due แยก pending, failed และ completed อย่างชัดเจน
- NBV เท่ากับ gross cost หัก accumulated depreciation ภายใต้ as-of เดียวกัน
- Forecast รวมเฉพาะ approved/planned cash movements และระบุแหล่งที่มา
