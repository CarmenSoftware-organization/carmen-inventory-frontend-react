import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { ExtraCost } from "@/types/extra-cost";

/**
 * สร้าง Zod schema สำหรับฟอร์ม Extra Cost พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Extra Cost
 * @example
 * // route: /config/extra-cost (dialog)
 * const schema = createExtraCostSchema(tv, tfl);
 */
export function createExtraCostSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    is_active: z.boolean(),
  });
}

export type ExtraCostFormValues = z.infer<ReturnType<typeof createExtraCostSchema>>;

export const EMPTY_FORM: ExtraCostFormValues = {
  name: "",
  is_active: true,
};

/**
 * คืนค่าเริ่มต้นของฟอร์ม Extra Cost จาก entity ที่มี หรือค่าว่างหากไม่มี
 * @param extraCost - ข้อมูล Extra Cost ที่ต้องการนำมาเป็นค่าเริ่มต้น (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม
 * @example
 * // route: /config/extra-cost (dialog)
 * const defaults = getDefaultValues(extraCost);
 */
export function getDefaultValues(extraCost?: ExtraCost): ExtraCostFormValues {
  if (!extraCost) return { ...EMPTY_FORM };
  return {
    name: extraCost.name,
    is_active: extraCost.is_active,
  };
}
