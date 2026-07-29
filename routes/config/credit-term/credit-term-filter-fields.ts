import type { FilterFieldDef } from "@/types/list-filter";

/** ตัวกรองของหน้ารายการเงื่อนไขเครดิต — status ใช้ค่า clause เต็มใน URL param "filter" */
export const CREDIT_TERM_FILTER_FIELDS: FilterFieldDef[] = [
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
