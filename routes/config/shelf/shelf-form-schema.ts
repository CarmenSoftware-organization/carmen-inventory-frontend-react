import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { Shelf } from "@/types/shelf";

/**
 * สร้าง Zod schema สำหรับฟอร์ม Shelf พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Shelf
 * @example
 * // route: /config/shelf (dialog)
 * const schema = createShelfSchema(tv, tfl);
 */
export function createShelfSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    location_id: z.string().min(1, tv("required", { field: tf("location") })),
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string().optional(),
    // ช่องว่าง = ไม่ส่ง (ให้ backend จัดลำดับเอง) — z.coerce เปล่า ๆ ตีค่า "" เป็น 0
    sequence_no: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce
        .number()
        .int(tv("minNumber", { field: tf("sequence"), min: 1 }))
        .min(1, tv("minNumber", { field: tf("sequence"), min: 1 }))
        .optional(),
    ),
    is_active: z.boolean(),
  });
}

export type ShelfFormValues = z.infer<ReturnType<typeof createShelfSchema>>;

export const EMPTY_FORM: ShelfFormValues = {
  location_id: "",
  code: "",
  name: "",
  description: "",
  sequence_no: undefined,
  is_active: true,
};

/**
 * คืนค่าเริ่มต้นของฟอร์ม Shelf จาก entity ที่มี หรือค่าว่างหากไม่มี
 * @param shelf - ข้อมูล Shelf ที่ต้องการนำมาเป็นค่าเริ่มต้น (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม
 * @example
 * // route: /config/shelf (dialog)
 * const defaults = getDefaultValues(shelf);
 */
export function getDefaultValues(shelf?: Shelf): ShelfFormValues {
  if (!shelf) return { ...EMPTY_FORM };
  return {
    location_id: shelf.location_id,
    code: shelf.code,
    name: shelf.name,
    description: shelf.description ?? "",
    sequence_no: shelf.sequence_no ?? undefined,
    is_active: shelf.is_active,
  };
}
