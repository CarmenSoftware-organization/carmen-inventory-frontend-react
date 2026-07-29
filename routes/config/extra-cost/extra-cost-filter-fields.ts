import type { FilterFieldDef } from "@/types/list-filter";

/** ตัวกรองของหน้ารายการค่าใช้จ่ายเพิ่มเติม — status ใช้ค่า clause เต็มใน URL param "filter" */
export const EXTRA_COST_FILTER_FIELDS: FilterFieldDef[] = [
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
