import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import { transferPayloadSchema } from "@/utils/transfer-handler";
import type { Department } from "@/types/department";

/**
 * สร้าง Zod schema สำหรับฟอร์ม Department พร้อมข้อความแปลจาก i18n
 *
 * เรียกภายใน `DepartmentForm` เพื่อใช้กับ `zodResolver`
 *
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Department
 * @example
 * ```ts
 * const schema = createDepartmentSchema(tv, tf);
 * useForm({ resolver: zodResolver(schema) });
 * ```
 */
export function createDepartmentSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    description: z.string(),
    is_active: z.boolean(),
    department_users: transferPayloadSchema,
    hod_users: transferPayloadSchema,
  });
}

export type DepartmentFormValues = z.infer<
  ReturnType<typeof createDepartmentSchema>
>;

const emptyTransfer = { add: [], remove: [] };

export const EMPTY_FORM: DepartmentFormValues = {
  code: "",
  name: "",
  description: "",
  is_active: true,
  department_users: { ...emptyTransfer },
  hod_users: { ...emptyTransfer },
};

/**
 * คืนค่าเริ่มต้นของฟอร์ม Department จาก entity ที่มี หรือค่าว่างหากไม่มี
 *
 * ใช้ใน `useForm({ defaultValues: getDefaultValues(department) })`
 *
 * @param department - ข้อมูล Department ที่ต้องการนำมาเป็นค่าเริ่มต้น (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม
 * @example
 * ```ts
 * const defaults = getDefaultValues(department);
 * ```
 */
export function getDefaultValues(
  department?: Department,
): DepartmentFormValues {
  if (!department) return { ...EMPTY_FORM };
  return {
    code: department.code,
    name: department.name,
    description: department.description,
    is_active: department.is_active,
    department_users: { ...emptyTransfer },
    hod_users: { ...emptyTransfer },
  };
}
