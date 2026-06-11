import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { EquipmentCategory } from "@/types/equipment-category";

/**
 * สร้าง Zod schema สำหรับตรวจสอบฟอร์มหมวดหมู่อุปกรณ์พร้อมข้อความแปลภาษา
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema object
 */
export function createEquipmentCategorySchema(
  tv: TranslationFn,
  tf: TranslationFn,
) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
    is_active: z.boolean(),
  });
}

export type EquipmentCategoryFormValues = z.infer<
  ReturnType<typeof createEquipmentCategorySchema>
>;

export const EMPTY_FORM: EquipmentCategoryFormValues = {
  name: "",
  description: "",
  is_active: true,
};

/**
 * แปลงข้อมูลหมวดหมู่อุปกรณ์เป็นค่าเริ่มต้นของฟอร์ม
 * @param equipmentCategory - ข้อมูลหมวดหมู่อุปกรณ์ที่มีอยู่ (ถ้ามี)
 * @returns ค่าเริ่มต้นของฟอร์ม
 * @example
 * const defaults = getDefaultValues(equipmentCategory);
 * form.reset(defaults);
 */
export function getDefaultValues(
  equipmentCategory?: EquipmentCategory,
): EquipmentCategoryFormValues {
  if (!equipmentCategory) return EMPTY_FORM;
  return {
    name: equipmentCategory.name,
    description: equipmentCategory.description ?? "",
    is_active: equipmentCategory.is_active,
  };
}

/**
 * แปลงค่าจากฟอร์มหมวดหมู่อุปกรณ์เป็น payload สำหรับส่งไปยัง API
 * @param values - ค่าฟอร์มหมวดหมู่อุปกรณ์
 * @returns payload พร้อมส่งไปยัง API
 * @example
 * const payload = mapToPayload(form.getValues());
 * await createEquipmentCategory(payload);
 */
export function mapToPayload(values: EquipmentCategoryFormValues) {
  return {
    name: values.name,
    description: values.description || null,
    is_active: values.is_active,
  };
}
