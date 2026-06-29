import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { PhysicalCount } from "@/types/physical-count";

/**
 * สร้าง Zod schema สำหรับตรวจสอบฟอร์ม Physical Count
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema ของฟอร์ม physical count
 */
export function createPhysicalCountSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    department_id: z.string().min(1, tv("required", { field: tf("department") })),
    physical_count_period_id: z.string().optional(),
  });
}

export type PhysicalCountFormValues = z.infer<ReturnType<typeof createPhysicalCountSchema>>;

// --- Defaults ---

export const EMPTY_FORM: PhysicalCountFormValues = {
  department_id: "",
  physical_count_period_id: "",
};

// --- Helpers ---

/**
 * สร้างค่า default ของฟอร์ม Physical Count จากข้อมูลที่มีอยู่
 * ใช้ใน PcForm ทั้งโหมด add (ไม่ส่ง arg) และ edit (ส่ง entity)
 *
 * @param physicalCount - entity เดิมสำหรับโหมดแก้ไข (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม physical count
 * @example
 * const defaults = getDefaultValues(physicalCount);
 * const form = useForm({ defaultValues: defaults });
 */
export function getDefaultValues(
  physicalCount?: PhysicalCount,
): PhysicalCountFormValues {
  if (physicalCount) {
    return {
      department_id: physicalCount.department_id ?? "",
      physical_count_period_id: "",
    };
  }
  return { ...EMPTY_FORM };
}
