import type { FilterFieldDef } from "@/types/list-filter";

/**
 * ตัวกรองของหน้ารายการคลัง — status ใช้ค่า clause เต็มใน URL param "filter",
 * ประเภทคลัง (URL param "location_type") และการตรวจนับสินค้า (URL param
 * "physical_count_type") เป็น multi-select ค่าตัวเลือกเป็น clause เต็มอยู่แล้ว
 * เหมือนของเดิมที่เคยอยู่ใน extraToolbar
 */
export const LOCATION_FILTER_FIELDS: FilterFieldDef[] = [
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
    key: "location_type",
    control: "multi-select",
    labelKey: "field.locationType",
    options: [
      {
        labelKey: "config.location.typeInventory",
        value: "location_type|string:inventory",
      },
      {
        labelKey: "config.location.typeDirect",
        value: "location_type|string:direct",
      },
      {
        labelKey: "config.location.typeConsignment",
        value: "location_type|string:consignment",
      },
    ],
  },
  {
    key: "physical_count_type",
    control: "multi-select",
    labelKey: "field.physicalCount",
    options: [
      {
        labelKey: "config.location.pcYes",
        value: "physical_count_type|string:yes",
      },
      {
        labelKey: "config.location.pcNo",
        value: "physical_count_type|string:no",
      },
    ],
  },
];
