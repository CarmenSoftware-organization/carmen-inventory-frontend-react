import { z } from "zod";
import type { RoleDetail } from "@/types/role";

export const roleSchema = z.object({
  application_role_name: z.string().min(1, "Name is required"),
  permissions: z.array(z.string()),
});

export type RoleFormValues = z.infer<typeof roleSchema>;

export const EMPTY_FORM: RoleFormValues = {
  application_role_name: "",
  permissions: [],
};

/**
 * คืนค่าเริ่มต้นของฟอร์ม Role จากข้อมูล RoleDetail
 * @param role - ข้อมูล Role ที่ต้องการใช้เป็นค่าเริ่มต้น
 * @returns ค่าเริ่มต้นของ RoleFormValues
 */
export function getDefaultValues(role?: RoleDetail): RoleFormValues {
  if (!role) return EMPTY_FORM;
  return {
    application_role_name: role.application_role_name,
    permissions: role.permissions.map((p) => p.permission_id),
  };
}
