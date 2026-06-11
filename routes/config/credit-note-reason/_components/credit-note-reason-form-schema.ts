import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

/**
 * สร้าง Zod schema สำหรับฟอร์ม Credit Note Reason พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Credit Note Reason
 * @example
 * // route: /config/credit-note-reason (dialog)
 * const schema = createCreditNoteReasonSchema(tv, tfl);
 */
export function createCnReasonSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
  });
}

export type CnReasonFormValues = z.infer<
  ReturnType<typeof createCnReasonSchema>
>;
