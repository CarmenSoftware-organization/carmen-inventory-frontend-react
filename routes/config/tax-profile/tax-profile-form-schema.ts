import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { TaxProfile } from "@/types/tax-profile";

/**
 * สร้าง Zod schema สำหรับฟอร์ม Tax Profile พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Tax Profile
 * @example
 * // route: /config/tax-profile (dialog)
 * const schema = createTaxProfileSchema(tv, tfl);
 */
export function createTaxProfileSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    tax_rate: z.number().min(0, tv("taxRatePositive")),
    is_active: z.boolean(),
  });
}

export type TaxProfileFormValues = z.infer<ReturnType<typeof createTaxProfileSchema>>;

export const EMPTY_FORM: TaxProfileFormValues = {
  name: "",
  tax_rate: 0,
  is_active: true,
};

/**
 * คืนค่าเริ่มต้นของฟอร์ม Tax Profile จาก entity ที่มี หรือค่าว่างหากไม่มี
 * @param taxProfile - ข้อมูล Tax Profile ที่ต้องการนำมาเป็นค่าเริ่มต้น (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม
 * @example
 * // route: /config/tax-profile (dialog)
 * const defaults = getDefaultValues(taxProfile);
 */
export function getDefaultValues(taxProfile?: TaxProfile): TaxProfileFormValues {
  if (!taxProfile) return { ...EMPTY_FORM };
  return {
    name: taxProfile.name,
    tax_rate: taxProfile.tax_rate,
    is_active: taxProfile.is_active,
  };
}
