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

/**
 * เทียบบทบาทชุดเดิมกับชุดใหม่ แล้วคืนเฉพาะส่วนต่าง
 *
 * API รับเป็น diff (`{add, remove}`) ไม่ใช่ทั้งชุด บทบาทที่ไม่ได้แตะจึงต้องไม่ถูก
 * ส่งไปเลย — ส่งผิดฝั่งทีเดียวคือผู้ใช้ได้สิทธิ์ที่ไม่ควรได้ หรือโดนถอดสิทธิ์ที่ควรมี
 * และไม่มีอะไรจับได้จนกว่าจะมีคนบ่น
 *
 * @param initial - บทบาทที่ผู้ใช้มีอยู่ตอนเปิดฟอร์ม
 * @param next - บทบาทที่เลือกไว้ตอนกดบันทึก
 * @returns `{ add, remove }` — ว่างทั้งคู่แปลว่าไม่มีอะไรเปลี่ยน ไม่ต้องยิง API
 * @example
 * buildRolePatch(["a", "b"], ["b", "c"]); // { add: ["c"], remove: ["a"] }
 */
export function buildRolePatch(initial: string[], next: string[]) {
  const initialSet = new Set(initial);
  const nextSet = new Set(next);
  return {
    add: next.filter((id) => !initialSet.has(id)),
    remove: initial.filter((id) => !nextSet.has(id)),
  };
}
