import { z } from "zod";
import type { UpdateUserPayload, UserDetail } from "@/types/user";

export const userAssignedSchema = z.object({
  role_ids: z.array(z.string()),
  location_ids: z.array(z.string()),
  /** ว่าง = ไม่สังกัดแผนกไหน — ผู้ใช้อยู่ได้แผนกเดียวเท่านั้น */
  department_id: z.string(),
});

export type UserAssignedFormValues = z.infer<typeof userAssignedSchema>;

/**
 * คืนค่าเริ่มต้นของฟอร์มจากข้อมูลผู้ใช้
 *
 * ทั้งบทบาทและคลังเก็บเป็น **id ของตัวจริง** (`application_role_id` /
 * `location_id`) ไม่ใช่ `id` ของแถวเชื่อม — ส่ง id ผิดตัวขึ้นไปคือ backend
 * หาไม่เจอแล้วเงียบ ไม่มี typecheck ตัวไหนจับได้เพราะเป็น string เหมือนกัน
 *
 * @param user - ข้อมูลผู้ใช้จาก `GET /config/{bu}/users/{id}`
 * @returns ค่าเริ่มต้นของ UserAssignedFormValues
 */
export function getDefaultValues(user: UserDetail): UserAssignedFormValues {
  return {
    role_ids: user.application_roles.map((r) => r.application_role_id),
    location_ids: user.locations.map((l) => l.location_id),
    department_id: user.department?.id ?? "",
  };
}

/**
 * เทียบ id ชุดเดิมกับชุดใหม่ แล้วคืนเฉพาะส่วนต่าง
 *
 * API รับเป็น diff (`{add, remove}`) ไม่ใช่ทั้งชุด ของที่ไม่ได้แตะจึงต้องไม่ถูก
 * ส่งไปเลย — ส่งผิดฝั่งทีเดียวคือผู้ใช้ได้สิทธิ์ที่ไม่ควรได้ หรือโดนถอดสิทธิ์ที่ควรมี
 * และไม่มีอะไรจับได้จนกว่าจะมีคนบ่น
 *
 * @param initial - id ที่ผู้ใช้มีอยู่ตอนเปิดฟอร์ม
 * @param next - id ที่เลือกไว้ตอนกดบันทึก
 * @returns `{ add, remove }` — ว่างทั้งคู่แปลว่าไม่มีอะไรเปลี่ยน
 * @example
 * buildIdPatch(["a", "b"], ["b", "c"]); // { add: ["c"], remove: ["a"] }
 */
export function buildIdPatch(initial: string[], next: string[]) {
  const initialSet = new Set(initial);
  const nextSet = new Set(next);
  return {
    add: next.filter((id) => !initialSet.has(id)),
    remove: initial.filter((id) => !nextSet.has(id)),
  };
}

/**
 * ประกอบ body ของ PATCH จากค่าตั้งต้นกับค่าที่กรอก — ใส่เฉพาะส่วนที่เปลี่ยนจริง
 *
 * PATCH ที่ส่ง field มาครบทุกครั้งจะเขียนทับของที่คนอื่นเพิ่งแก้ไปโดยไม่ตั้งใจ
 * (คลังของผู้ใช้แก้ได้จาก `/config/location` ด้วย) field ที่ไม่ได้แตะจึงต้องไม่
 * ปรากฏใน body เลย
 *
 * @param initial - ค่าตอนเปิดฟอร์ม (จาก `getDefaultValues`)
 * @param next - ค่าตอนกดบันทึก
 * @returns body ที่ส่งได้เลย — `null` เมื่อไม่มีอะไรเปลี่ยน (ไม่ต้องยิง API)
 */
export function buildUserPatch(
  initial: UserAssignedFormValues,
  next: UserAssignedFormValues,
): UpdateUserPayload | null {
  const payload: UpdateUserPayload = {};

  const roles = buildIdPatch(initial.role_ids, next.role_ids);
  if (roles.add.length > 0 || roles.remove.length > 0) {
    payload.application_role_id = roles;
  }

  const locations = buildIdPatch(initial.location_ids, next.location_ids);
  if (locations.add.length > 0 || locations.remove.length > 0) {
    payload.location_id = locations;
  }

  if (next.department_id !== initial.department_id) {
    payload.department_id = next.department_id;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}
