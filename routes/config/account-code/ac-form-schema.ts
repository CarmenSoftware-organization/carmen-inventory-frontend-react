import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

/**
 * สร้าง Zod schema สำหรับฟอร์มรหัสบัญชี พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์มรหัสบัญชี
 * @example
 * // route: /config/account-code (dialog)
 * const schema = createAcSchema(tv, tfl);
 */
export function createAcSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string().optional(),
    is_active: z.boolean(),
  });
}

export type AcFormValues = z.infer<ReturnType<typeof createAcSchema>>;
