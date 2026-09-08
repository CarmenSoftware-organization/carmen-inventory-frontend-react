import type { FilterFieldDef } from "@/types/list-filter";
import {
  CHART_OF_ACCOUNT_TYPE,
  ACCOUNT_NATURE,
} from "@/types/chart-of-account";

/**
 * ตัวกรองของหน้ารหัสบัญชี — ทุกช่องเก็บ clause เต็มใน URL param ของตัวเอง
 * (`is_active|bool:true`, `nature|string:debit`) จึงไม่ต้องประกาศ `toClause`
 *
 * ด้านบัญชีกับประเภทเป็น multi-select เพราะคนทำผังบัญชีมักดูทีละกลุ่ม เช่น
 * "ขอดูบัญชีงบกำไรขาดทุนทั้งหมด" หรือ "เอาเฉพาะฝั่งเดบิต" — MultiSelectFilter
 * ต่อ clause ซ้ำ prefix ให้เอง แล้ว gateway แปลงเป็น IN query (แบบเดียวกับ
 * ประเภทใบเบิกในหน้า store-requisition)
 */
export const COA_FILTER_FIELDS: FilterFieldDef[] = [
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
    key: "nature",
    control: "multi-select",
    labelKey: "field.nature",
    options: [
      {
        labelKey: "config.chartOfAccount.nature.debit",
        value: `nature|string:${ACCOUNT_NATURE.DEBIT}`,
      },
      {
        labelKey: "config.chartOfAccount.nature.credit",
        value: `nature|string:${ACCOUNT_NATURE.CREDIT}`,
      },
    ],
  },
  {
    key: "type",
    control: "multi-select",
    labelKey: "field.type",
    options: [
      {
        labelKey: "config.chartOfAccount.accountType.header",
        value: `type|string:${CHART_OF_ACCOUNT_TYPE.HEADER}`,
      },
      {
        labelKey: "config.chartOfAccount.accountType.balance_sheet",
        value: `type|string:${CHART_OF_ACCOUNT_TYPE.BALANCE_SHEET}`,
      },
      {
        labelKey: "config.chartOfAccount.accountType.income_statement",
        value: `type|string:${CHART_OF_ACCOUNT_TYPE.INCOME_STATEMENT}`,
      },
      {
        labelKey: "config.chartOfAccount.accountType.statistic",
        value: `type|string:${CHART_OF_ACCOUNT_TYPE.STATISTIC}`,
      },
    ],
  },
];
