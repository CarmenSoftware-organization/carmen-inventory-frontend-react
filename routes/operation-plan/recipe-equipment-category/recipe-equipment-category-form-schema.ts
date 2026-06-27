import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

/**
 * สร้าง Zod schema สำหรับตรวจสอบฟอร์มหมวดหมู่อุปกรณ์สูตรอาหารพร้อมข้อความแปลภาษา
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema object
 */
export function createRecipeEquipmentCategorySchema(
  tv: TranslationFn,
  tf: TranslationFn,
) {
  return z.object({
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
    is_active: z.boolean(),
  });
}

export type RecipeEquipmentCategoryFormValues = z.infer<
  ReturnType<typeof createRecipeEquipmentCategorySchema>
>;

export const EMPTY_FORM: RecipeEquipmentCategoryFormValues = {
  name: "",
  description: "",
  is_active: true,
};
