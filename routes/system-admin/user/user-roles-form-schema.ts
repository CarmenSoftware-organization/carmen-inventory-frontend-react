import { z } from "zod";
import type { UserDetail } from "@/types/user";

export const userRolesSchema = z.object({
  role_ids: z.array(z.string()),
});

export type UserRolesFormValues = z.infer<typeof userRolesSchema>;

/**
 * คืนค่าเริ่มต้นของฟอร์ม User Roles จากข้อมูล UserDetail
 * @param user - ข้อมูลผู้ใช้ที่มี application_roles
 * @returns ค่าเริ่มต้นของ UserRolesFormValues ที่มี role_ids
 */
export function getDefaultValues(user: UserDetail): UserRolesFormValues {
  return {
    role_ids: user.application_roles.map((r) => r.application_role_id),
  };
}
