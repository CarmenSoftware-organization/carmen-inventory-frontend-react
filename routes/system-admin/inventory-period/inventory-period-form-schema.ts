import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { InventoryPeriod } from "@/types/inventory-period";

/**
 * สร้าง Zod schema สำหรับตรวจสอบฟอร์มรอบสินค้าคงคลัง (InventoryPeriod)
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema สำหรับ InventoryPeriod form
 */
export function createInventoryPeriodSchema(tv: TranslationFn, tf: TranslationFn) {
  return z
    .object({
      fiscal_year: z.coerce
        .number()
        .min(1, tv("required", { field: tf("fiscalYear") })),
      fiscal_month: z.coerce
        .number()
        .min(1, tv("minMonth", { min: 1 }))
        .max(12, tv("maxMonth", { max: 12 })),
      start_at: z.string().min(1, tv("required", { field: tf("startDate") })),
      end_at: z.string().min(1, tv("required", { field: tf("endDate") })),
      status: z.enum(["open", "closed", "locked"]),
    })
    .refine(
      (data) =>
        !data.start_at ||
        !data.end_at ||
        new Date(data.end_at) >= new Date(data.start_at),
      { message: tv("endDateAfterStart"), path: ["end_at"] },
    );
}

export type InventoryPeriodFormValues = z.infer<ReturnType<typeof createInventoryPeriodSchema>>;

export const EMPTY_FORM: InventoryPeriodFormValues = {
  fiscal_year: new Date().getFullYear(),
  fiscal_month: 1,
  start_at: "",
  end_at: "",
  status: "open",
};

/**
 * คืนค่าเริ่มต้นของฟอร์มจาก entity InventoryPeriod (หากไม่มีจะคืน EMPTY_FORM)
 * @param period - ข้อมูล InventoryPeriod ที่ต้องการใช้เป็นค่าเริ่มต้น
 * @returns ค่าเริ่มต้นของ InventoryPeriodFormValues
 */
export function getDefaultValues(period?: InventoryPeriod | null): InventoryPeriodFormValues {
  if (!period) return EMPTY_FORM;
  return {
    fiscal_year: period.fiscal_year,
    fiscal_month: period.fiscal_month,
    start_at: period.start_at,
    end_at: period.end_at,
    status: period.status,
  };
}
