import type { FilterFieldDef } from "@/types/list-filter";
import { ADJUSTMENT_TYPE } from "@/types/adjustment-type";

/**
 * ตัวกรองของหน้ารายการประเภทการปรับปรุงสต๊อก — status ใช้ค่า clause เต็มใน URL
 * param "filter", ประเภท (stock in/out) ใช้ URL param "adj_type" แบบ multi-select
 * (ค่าตัวเลือกเป็น clause เต็มอยู่แล้ว เหมือนของเดิมที่เคยอยู่ใน extraToolbar)
 */
export const ADJUSTMENT_TYPE_FILTER_FIELDS: FilterFieldDef[] = [
  {
    key: "filter",
    control: "status",
    labelKey: "common.status",
    options: [
      { labelKey: "status.active", value: "is_active|bool:true" },
      { labelKey: "status.inactive", value: "is_active|bool:false" },
    ],
  },
  {
    key: "adj_type",
    control: "multi-select",
    labelKey: "field.type",
    options: [
      {
        labelKey: "field.stockIn",
        value: `type|string:${ADJUSTMENT_TYPE.STOCK_IN}`,
      },
      {
        labelKey: "field.stockOut",
        value: `type|string:${ADJUSTMENT_TYPE.STOCK_OUT}`,
      },
    ],
  },
];
