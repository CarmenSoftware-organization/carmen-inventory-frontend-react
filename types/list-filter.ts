import type { ReactNode } from "react";
import type { WORKFLOW_TYPE } from "@/types/workflows";

/**
 * ช่องทางอ่าน/เขียนค่า field อื่นจากใน custom control — ชี้ไปที่ draft ของ
 * ListFilterSheet (ไม่ใช่ URL ตรง) เพื่อให้ field คู่ เช่น `created_at_to` ของ
 * `created_at_from` เดินตาม apply-on-Done เดียวกันกับ onChange ปกติ
 */
export interface FilterPeerAccess {
  readonly get: (key: string) => string;
  readonly set: (key: string, value: string) => void;
}

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
  /**
   * field นี้ยังคง "จริง" ในแง่ values/encode(toClause)/saved-views/dirty ตามปกติ
   * แต่**ไม่ render อะไรเลย**ใน ListFilterSheet และ**ไม่ผลิต chip**ใน ActiveFilterBar
   * ใช้กับ field คู่ที่เป็น "hidden holder" ของอีก field หนึ่ง เช่น date-range สอง
   * key (`created_at_from`/`created_at_to`) ที่มี UI ควบคุมร่วมกันจุดเดียว
   */
  readonly hidden?: boolean;
  /**
   * key อื่นที่ต้องถูกล้างไปพร้อมกันเมื่อ chip ของ field นี้ใน ActiveFilterBar ถูกกด
   * ลบ (ดู `useListFilters`'s `activeFilters.onRemove`) — กันไม่ให้ key คู่กัน (เช่น
   * `created_at_to` ของ `created_at_from`) ค้างค่าเก่าไว้เดี่ยว ๆ หลังผู้ใช้กดลบแค่ chip เดียว
   */
  readonly linkedKeys?: readonly string[];
  /**
   * i18n key ของหัวข้อ section ใน ListFilterSheet — field ติดกันที่ section
   * เดียวกันถูกจัดกลุ่มใต้หัวข้อเดียว (เรียง field ให้กลุ่มเดียวกันอยู่ติดกันเอง)
   * ไม่ระบุ = ไม่มีหัวข้อ render แบนเหมือนเดิม
   */
  readonly section?: string;
  /**
   * แปลงค่า URL → ข้อความค่าบน chip ของ ActiveFilterBar (เช่น "Draft +2")
   * ไม่ระบุ = derive อัตโนมัติ: options ที่ประกาศใน field → label, date_range →
   * "จาก – ถึง", ค่า slug อ่านออก → โชว์ตรง, id (uuid) → จำนวนรายการ
   */
  readonly valueText?: (value: string) => string;
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
  | (FilterFieldBase & {
      readonly control: "date-range";
      readonly fieldKey: string;
    })
  | (FilterFieldBase & { readonly control: "department" })
  | (FilterFieldBase & {
      readonly control: "requester";
      /** ชื่อคอลัมน์ใน clause — default `requestor_id` (PO ใช้ `created_by_id` กรองผู้จัดซื้อ) */
      readonly fieldKey?: string;
    })
  | (FilterFieldBase & { readonly control: "stage"; readonly stages: string[] })
  | (FilterFieldBase & {
      readonly control: "workflow";
      readonly workflowType: WORKFLOW_TYPE;
    })
  | (FilterFieldBase & {
      readonly control: "custom";
      readonly render: (
        value: string,
        onChange: (v: string) => void,
        peer?: FilterPeerAccess,
      ) => ReactNode;
    });
