import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

/**
 * สร้าง Zod schema สำหรับฟอร์ม Credit Term พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Credit Term
 * @example
 * // route: /config/credit-term (dialog)
 * const schema = createCreditTermSchema(tv, tfl);
 */
export function createCreditTermSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    value: z.coerce
      .number()
      .min(1, tv("minNumber", { field: tf("creditTermDays"), min: 1 })),
    description: z.string().optional(),
    is_active: z.boolean(),
  });
}

export type CreditTermFormValues = z.infer<
  ReturnType<typeof createCreditTermSchema>
>;
