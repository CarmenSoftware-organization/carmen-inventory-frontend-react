import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";

/**
 * สร้าง Zod schema สำหรับรายการสินค้าใน wastage report
 * ใช้ภายใน createWrSchema สำหรับตรวจสอบ items array
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod object schema ของ WR detail
 * @example
 * const detailSchema = createWrDetailSchema(tv, tf);
 */
export function createWrDetailSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    id: z.string().optional(),
    product_id: z.string().min(1, tv("required", { field: tf("product") })),
    product_name: z.string(),
    product_code: z.string(),
    qty: z.coerce.number().min(1, tv("minNumber", { field: tf("qty"), min: 1 })),
    unit_id: z.string().min(1, tv("required", { field: tf("unit") })),
    unit_name: z.string(),
    unit_cost: z.coerce.number().min(0, tv("minZero", { field: tf("costPerUnit") })),
  });
}

/**
 * สร้าง Zod schema หลักของฟอร์ม Wastage Report
 * รวมฟิลด์หัว (date, location, reason) และ items array
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema ของ WR form
 * @example
 * const schema = createWrSchema(tv, tf);
 * const form = useForm({ resolver: zodResolver(schema) });
 */
export function createWrSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    date: z.string().min(1, tv("required", { field: tf("date") })),
    location_id: z.string().min(1, tv("required", { field: tf("location") })),
    reason: z.string().min(1, tv("required", { field: tf("reason") })),
    items: z.array(createWrDetailSchema(tv, tf)),
  });
}

export type WrFormValues = z.infer<ReturnType<typeof createWrSchema>>;

export const WR_ITEM = {
  product_id: "",
  product_name: "",
  product_code: "",
  qty: 1,
  unit_id: "",
  unit_name: "",
  unit_cost: 0,
} as const;

/**
 * แปลงรายการ item ของฟอร์มเป็น payload ส่งให้ API
 * ใช้กับ buildItemChanges ใน WastageReportForm onSubmit
 *
 * @param item - รายการ item จากฟอร์ม
 * @returns payload พร้อมส่ง API (product_id, qty, unit_id, unit_cost)
 * @example
 * const payload = mapItemToPayload(item);
 */
export function mapItemToPayload(item: WrFormValues["items"][number]) {
  return {
    product_id: item.product_id,
    qty: item.qty,
    unit_id: item.unit_id,
    unit_cost: item.unit_cost,
  };
}
