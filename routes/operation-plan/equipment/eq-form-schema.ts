import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { Equipment } from "@/types/equipment";

/**
 * สร้าง Zod schema สำหรับตรวจสอบฟอร์มอุปกรณ์พร้อมข้อความแปลภาษา
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อฟิลด์
 * @returns Zod schema object
 */
export function createEquipmentSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
    category_id: z.string().nullable(),
    brand: z.string(),
    model: z.string(),
    serial_no: z.string(),
    capacity: z.string(),
    power_rating: z.string(),
    station: z.string(),
    operation_instructions: z.string(),
    safety_notes: z.string(),
    cleaning_instructions: z.string(),
    maintenance_schedule: z.string(),
    last_maintenance_date: z.string(),
    next_maintenance_date: z.string(),
    note: z.string(),
    is_active: z.boolean(),
    is_portable: z.boolean(),
    available_qty: z.coerce.number().min(0, tv("minNumber", { field: tf("qty"), min: 0 })),
    total_qty: z.coerce.number().min(0, tv("minNumber", { field: tf("qty"), min: 0 })),
    usage_count: z.coerce.number().min(0, tv("minNumber", { field: tf("qty"), min: 0 })),
    average_usage_time: z.coerce.number().min(0, tv("minNumber", { field: tf("qty"), min: 0 })),
  });
}

export type EquipmentFormValues = z.infer<ReturnType<typeof createEquipmentSchema>>;

/**
 * แปลงข้อมูลอุปกรณ์เป็นค่าเริ่มต้นของฟอร์ม
 * @param equipment - ข้อมูลอุปกรณ์ที่มีอยู่ (ถ้ามี)
 * @returns ค่าเริ่มต้นของฟอร์มอุปกรณ์
 * @example
 * const defaults = getDefaultValues(equipment);
 * form.reset(defaults);
 */
export function getDefaultValues(equipment?: Equipment): EquipmentFormValues {
  if (equipment) {
    return {
      code: equipment.code,
      name: equipment.name,
      description: equipment.description ?? "",
      category_id: equipment.category_id,
      brand: equipment.brand ?? "",
      model: equipment.model ?? "",
      serial_no: equipment.serial_no ?? "",
      capacity: equipment.capacity ?? "",
      power_rating: equipment.power_rating ?? "",
      station: equipment.station ?? "",
      operation_instructions: equipment.operation_instructions ?? "",
      safety_notes: equipment.safety_notes ?? "",
      cleaning_instructions: equipment.cleaning_instructions ?? "",
      maintenance_schedule: equipment.maintenance_schedule ?? "",
      last_maintenance_date: equipment.last_maintenance_date ?? "",
      next_maintenance_date: equipment.next_maintenance_date ?? "",
      note: equipment.note ?? "",
      is_active: equipment.is_active,
      is_portable: equipment.is_portable,
      available_qty: equipment.available_qty,
      total_qty: equipment.total_qty,
      usage_count: equipment.usage_count,
      average_usage_time: equipment.average_usage_time,
    };
  }
  return {
    code: "",
    name: "",
    description: "",
    category_id: null,
    brand: "",
    model: "",
    serial_no: "",
    capacity: "",
    power_rating: "",
    station: "",
    operation_instructions: "",
    safety_notes: "",
    cleaning_instructions: "",
    maintenance_schedule: "",
    last_maintenance_date: "",
    next_maintenance_date: "",
    note: "",
    is_active: true,
    is_portable: false,
    available_qty: 1,
    total_qty: 1,
    usage_count: 0,
    average_usage_time: 0,
  };
}
