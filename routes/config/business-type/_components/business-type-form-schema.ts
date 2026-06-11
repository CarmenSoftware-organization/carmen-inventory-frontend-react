import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { BusinessType } from "@/types/business-type";

/**
 * สร้าง Zod schema สำหรับฟอร์ม Business Type พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Business Type
 * @example
 * // route: /config/business-type (dialog)
 * const schema = createBusinessTypeSchema(tv, tfl);
 */
export function createBusinessTypeSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    is_active: z.boolean(),
  });
}

export type BusinessTypeFormValues = z.infer<
  ReturnType<typeof createBusinessTypeSchema>
>;

export const EMPTY_FORM: BusinessTypeFormValues = {
  name: "",
  is_active: true,
};

/**
 * คืนค่าเริ่มต้นของฟอร์ม Business Type จาก entity ที่มี หรือค่าว่างหากไม่มี
 * @param businessType - ข้อมูล Business Type ที่ต้องการนำมาเป็นค่าเริ่มต้น (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม
 * @example
 * // route: /config/business-type (dialog)
 * const defaults = getDefaultValues(businessType);
 */
export function getDefaultValues(
  businessType?: BusinessType,
): BusinessTypeFormValues {
  if (!businessType) return { ...EMPTY_FORM };
  return {
    name: businessType.name,
    is_active: businessType.is_active,
  };
}
