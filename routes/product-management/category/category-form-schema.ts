import { z } from "zod";
import type { CategoryNode, CategoryType } from "@/types/category";

export const categorySchema = z.object({
  code: z.string().min(1, "Code is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  is_active: z.boolean(),
  price_deviation_limit: z.coerce.number().min(0).max(100),
  qty_deviation_limit: z.coerce.number().min(0).max(100),
  is_used_in_recipe: z.boolean(),
  is_sold_directly: z.boolean(),
  tax_profile_id: z.string().min(1, "Tax profile is required"),
  tax_rate: z.coerce.number().min(0),
  product_category_id: z.string().optional(),
  product_subcategory_id: z.string().optional(),
  cascade_deviation: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

/**
 * สร้างค่าเริ่มต้นของฟอร์มหมวดหมู่ตามประเภทและ node ที่เกี่ยวข้อง
 * ถ้ามี selectedNode จะใช้ค่าเดิมของ node นั้น หากไม่มีจะสืบทอดจาก parentNode (deviation, flags, tax) เพื่อให้ child มีค่าเริ่มต้นสอดคล้องกับ parent
 * นอกจากนี้จะเพิ่ม product_category_id หรือ product_subcategory_id ให้อัตโนมัติตามประเภทของหมวดหมู่
 * @param type - ประเภทของหมวดหมู่ (category / subcategory / itemgroup)
 * @param selectedNode - node ที่กำลังแก้ไข (สำหรับโหมด edit, ถ้ามี)
 * @param parentNode - node แม่เพื่อสืบทอดค่าเริ่มต้น (สำหรับโหมด add)
 * @returns CategoryFormValues ที่พร้อมใช้เป็น defaultValues ใน react-hook-form
 * @example
 * const defaults = getDefaultValues("subcategory", undefined, categoryNode);
 * const form = useForm({ defaultValues: defaults });
 */
export function getDefaultValues(
  type: CategoryType,
  selectedNode?: CategoryNode,
  parentNode?: CategoryNode,
): CategoryFormValues {
  const base: CategoryFormValues = {
    code: selectedNode?.code ?? "",
    name: selectedNode?.name ?? "",
    description: selectedNode?.description ?? "",
    is_active: selectedNode?.is_active ?? true,
    cascade_deviation: selectedNode?.cascade_deviation ?? true,
    price_deviation_limit:
      selectedNode?.price_deviation_limit ??
      parentNode?.price_deviation_limit ??
      0,
    qty_deviation_limit:
      selectedNode?.qty_deviation_limit ??
      parentNode?.qty_deviation_limit ??
      0,
    is_used_in_recipe:
      selectedNode?.is_used_in_recipe ??
      parentNode?.is_used_in_recipe ??
      false,
    is_sold_directly:
      selectedNode?.is_sold_directly ?? parentNode?.is_sold_directly ?? false,
    tax_profile_id:
      selectedNode?.tax_profile_id ?? parentNode?.tax_profile_id ?? "",
    tax_rate: selectedNode?.tax_rate ?? parentNode?.tax_rate ?? 0,
  };
  if (type === "subcategory")
    base.product_category_id =
      selectedNode?.product_category_id ?? parentNode?.id ?? "";
  if (type === "itemgroup")
    base.product_subcategory_id =
      selectedNode?.product_subcategory_id ?? parentNode?.id ?? "";
  return base;
}
