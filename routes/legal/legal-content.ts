/**
 * เนื้อหาเอกสารกฎหมาย (ข้อตกลงการใช้บริการ / นโยบายความเป็นส่วนตัว)
 *
 * เก็บเป็น TS ไม่ใช่ messages/*.json เพราะยาวเป็นพันคำต่อฉบับต่อภาษา ยัดลง json
 * ที่ทั้งแอปใช้ทำให้ไฟล์นั้นบวมจนหา key อื่นไม่เจอ และเนื้อหากฎหมายไม่เคยถูก
 * interpolate แบบข้อความ UI ปกติ
 *
 * ⚠️ ก่อนขึ้น production ต้องให้ฝ่ายกฎหมายตรวจ และแก้ {@link LEGAL_ENTITY} ให้ตรง
 * กับนิติบุคคลจริง — ตัวเลขวันเก็บข้อมูลกับช่องทางติดต่อในเอกสารนี้คือคำสัญญา
 * ที่มีผลผูกพัน ไม่ใช่ placeholder ที่ปล่อยไว้ได้
 */

import { useLocale } from "use-intl";

export const LEGAL_ENTITY = {
  company: "Carmen Software",
  privacyEmail: "privacy@carmensoftware.com",
  supportEmail: "support@carmensoftware.com",
} as const;

export interface LegalSection {
  readonly id: string;
  readonly heading: string;
  readonly paragraphs?: readonly string[];
  readonly bullets?: readonly string[];
}

export interface LegalDocument {
  readonly title: string;
  readonly eyebrow: string;
  readonly effective: string;
  readonly intro: string;
  readonly sections: readonly LegalSection[];
  readonly crossLink: string;
  readonly tocLabel: string;
}

export type LegalLocale = "en" | "th";

export function useLegalDocument(
  documents: Record<LegalLocale, LegalDocument>,
): LegalDocument {
  const locale = useLocale();
  return locale === "th" ? documents.th : documents.en;
}
