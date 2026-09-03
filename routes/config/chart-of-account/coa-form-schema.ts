import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import {
  CHART_OF_ACCOUNT_TYPE,
  ACCOUNT_NATURE,
} from "@/types/chart-of-account";

/**
 * สร้าง Zod schema สำหรับฟอร์มรหัสบัญชี พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์มรหัสบัญชี
 * @example
 * // route: /config/chart-of-account (dialog)
 * const schema = createCoaSchema(tv, tfl);
 */
export function createCoaSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    description_1: z
      .string()
      .min(1, tv("required", { field: tf("description") })),
    // บรรทัดที่สองไม่บังคับ — ฟอร์มเก็บเป็น string ว่าง แล้วค่อยแปลงเป็น null ตอนส่ง
    description_2: z.string(),
    nature: z.enum(ACCOUNT_NATURE, {
      error: tv("required", { field: tf("nature") }),
    }),
    type: z.enum(CHART_OF_ACCOUNT_TYPE, {
      error: tv("required", { field: tf("type") }),
    }),
    is_active: z.boolean(),
  });
}

export type CoaFormValues = z.infer<ReturnType<typeof createCoaSchema>>;
