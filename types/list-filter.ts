import type { ReactNode } from "react";
import type { WORKFLOW_TYPE } from "@/types/workflows";

interface FilterFieldBase {
  /** ชื่อ URL param — ต้องตรงกับที่หน้าเดิมใช้ เพื่อไม่หัก deep link เก่า */
  readonly key: string;
  /** i18n key เต็ม เช่น "common.status" (แปลด้วย useTranslations() แบบไม่ระบุ namespace) */
  readonly labelKey: string;
  /**
   * แปลงค่า URL → backend filter clause — default คือส่งผ่านตรง
   * (ใช้กับ field ที่ URL เก็บ clause เต็มอยู่แล้ว เช่น "is_active|bool:true")
   * field แบบ CSV ดิบต้องประกาศเอง เช่น (v) => `doc_status|enum:${v}`
   */
  readonly toClause?: (value: string) => string;
}

/** นิยาม field หนึ่งตัวใน filter sheet ของหน้า list */
export type FilterFieldDef =
  | (FilterFieldBase & {
      readonly control: "status";
      readonly options?: { labelKey: string; value: string }[];
    })
  | (FilterFieldBase & {
      readonly control: "multi-select";
      readonly options: { labelKey: string; value: string }[];
      readonly searchable?: boolean;
    })
  | (FilterFieldBase & { readonly control: "date-range"; readonly fieldKey: string })
  | (FilterFieldBase & { readonly control: "department" })
  | (FilterFieldBase & { readonly control: "requester" })
  | (FilterFieldBase & { readonly control: "stage"; readonly stages: string[] })
  | (FilterFieldBase & { readonly control: "workflow"; readonly workflowType: WORKFLOW_TYPE })
  | (FilterFieldBase & {
      readonly control: "custom";
      readonly render: (value: string, onChange: (v: string) => void) => ReactNode;
    });
