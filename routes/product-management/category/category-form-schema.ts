import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { FormMode } from "@/types/form";

export function createCategorySchema(tv: TranslationFn, tf: TranslationFn) {
  const deviation = (field: string) =>
    z.coerce
      .number()
      .min(0, tv("minZero", { field: tf(field) }))
      .max(100, tv("maxNumber", { field: tf(field), max: 100 }));

  return z.object({
    code: z.string().optional(),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string().optional(),
    is_active: z.boolean(),
    price_deviation_limit: deviation("priceDeviation"),
    qty_deviation_limit: deviation("qtyDeviation"),
    is_used_in_recipe: z.boolean(),
    is_sold_directly: z.boolean(),
    tax_profile_id: z
      .string()
      .min(1, tv("required", { field: tf("taxProfile") })),
    tax_rate: z.coerce.number().min(0, tv("minZero", { field: tf("taxRate") })),
    product_category_id: z.string().optional(),
    product_subcategory_id: z.string().optional(),
    cascade_deviation: z.boolean(),
  });
}

export type CategoryFormValues = z.infer<
  ReturnType<typeof createCategorySchema>
>;

/**
 * ตัด field `code` ออกจาก payload เมื่ออยู่ในโหมด add เพื่อให้ backend สร้าง
 * running-number code ให้อัตโนมัติ ส่วนโหมด edit จะคง code เดิม (server-assigned)
 * ไว้ไม่เปลี่ยนแปลง
 * @param mode - โหมดของฟอร์ม (add / edit)
 * @param data - ค่าจากฟอร์มที่ผ่าน validation แล้ว
 * @returns payload ที่พร้อมส่ง — ไม่มี code ในโหมด add, คงเดิมในโหมด edit
 */
export function stripAutoCode(
  mode: FormMode,
  data: CategoryFormValues,
): CategoryFormValues {
  return mode === "add" ? { ...data, code: undefined } : data;
}
