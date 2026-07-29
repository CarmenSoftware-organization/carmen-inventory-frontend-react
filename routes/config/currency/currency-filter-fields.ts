import type { FilterFieldDef } from "@/types/list-filter";

/** ตัวกรองของหน้ารายการสกุลเงิน — status ใช้ค่า clause เต็มใน URL param "filter" */
export const CURRENCY_FILTER_FIELDS: FilterFieldDef[] = [
  {
    key: "filter",
    control: "status",
    labelKey: "common.status",
    options: [
      { labelKey: "status.active", value: "is_active|bool:true" },
      { labelKey: "status.inactive", value: "is_active|bool:false" },
    ],
  },
];
