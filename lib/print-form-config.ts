import type { PrintDocumentType } from "@/lib/print-document";
import type {
  BusinessUnitConfigItem,
  BusinessUnitDetail,
} from "@/types/business-unit";

/**
 * document type ที่ตั้งค่าแบบฟอร์มการพิมพ์ได้ — ลำดับเดียวกับที่แสดงในหน้า
 * Default Setting และตรงกับ `report_group` ของ report template ฝั่ง backend
 */
export const PRINT_FORM_DOCUMENT_TYPES: readonly PrintDocumentType[] = [
  "PR",
  "PO",
  "GRN",
  "SR",
  "CN",
  "IA",
  "PC",
  "SC",
  "RFQ",
  "INV",
] as const;

/**
 * key ของ config "แบบฟอร์มการพิมพ์" ของ document type หนึ่ง
 *
 * @param type - document type (เช่น "PR")
 * @returns key ที่เก็บใน BU config (เช่น "print-form.pr")
 */
export function printFormConfigKey(type: PrintDocumentType): string {
  return `print-form.${type.toLowerCase()}`;
}

/**
 * อ่าน report template id ที่ BU ตั้งไว้สำหรับ document type นั้น
 *
 * ค่าว่างหรือไม่มี key = ยังไม่ได้ตั้งค่า → คืน undefined เพื่อให้ backend ใช้
 * mapping เริ่มต้นตามเดิม (GET อาจคืน config เป็น `{}` จึงต้องเช็ค isArray)
 *
 * @param config - `config` จาก BusinessUnitDetail
 * @param type - document type ที่กำลังจะพิมพ์
 * @returns UUID ของ report template หรือ undefined
 */
export function resolvePrintFormTemplateId(
  config: BusinessUnitDetail["config"] | undefined,
  type: PrintDocumentType,
): string | undefined {
  if (!Array.isArray(config)) return undefined;
  const key = printFormConfigKey(type);
  const value = (config as BusinessUnitConfigItem[]).find(
    (i) => i.key === key,
  )?.value;
  return value ? value : undefined;
}
