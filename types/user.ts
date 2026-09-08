import type { INVENTORY_TYPE } from "@/constant/location";

/** ตัวตนของผู้ใช้ — ส่วนที่มาจากตาราง user กลาง ไม่ผูกกับ BU */
export interface UserAccount {
  username: string;
  email: string;
  alias_name: string;
  is_active: boolean;
  firstname: string;
  middlename: string;
  lastname: string;
  telephone: string;
  /** presigned URL อายุสั้น — อย่าเก็บลง cache ยาว ๆ หรือ hardcode ที่ไหน */
  avatar_url: string;
}

/** บทบาทหนึ่งใบที่ผูกกับผู้ใช้ — `id` คือตัว mapping ไม่ใช่ตัว role */
export interface UserRoleAssignment {
  id: string;
  application_role_id: string;
  application_role_name: string;
  application_role_description: string | null;
  assigned_at: string;
}

/** คลังหนึ่งใบที่ผูกกับผู้ใช้ — `id` คือตัว mapping ไม่ใช่ตัวคลัง */
export interface UserLocation {
  id: string;
  location_id: string;
  location_code: string;
  location_name: string;
  location_type: INVENTORY_TYPE;
  is_active: boolean;
}

/**
 * ผู้ใช้รายคนจาก `GET /config/{bu}/users/{id}`
 *
 * ก้อนเดียวจบ — บทบาท คลัง และแผนก มาพร้อมกันในนัดเดียว (เดิมเป็นสามนัดแยก
 * ที่ต้องรอนัดแรกเสร็จก่อนถึงจะยิงได้ เพราะต้องใช้ user_id จากมัน)
 */
export interface UserDetail {
  user_id: string;
  user: UserAccount;
  application_roles: UserRoleAssignment[];
  locations: UserLocation[];
  department: DepartmentRef | null;
}

/** ชุด id ที่เพิ่ม/ถอนในหนึ่งครั้ง — ส่งเฉพาะฝั่งที่มีของ ว่างทั้งคู่ = ไม่ต้องส่ง field นั้น */
export interface IdPatch {
  add?: string[];
  remove?: string[];
}

/**
 * body ของ `PATCH /config/{bu}/users/{user_id}` — ทุก field เป็น optional
 * ตามสัญญาของ PATCH ส่งเฉพาะส่วนที่เปลี่ยนจริง
 *
 * `user_id` ไม่อยู่ในนี้เพราะย้ายไปอยู่ใน path แล้ว (ดู `UpdateUserDto`)
 * department เป็นค่าเดี่ยว ไม่ใช่ add/remove — ผู้ใช้สังกัดแผนกเดียว
 */
export interface UpdateUserPayload {
  application_role_id?: IdPatch;
  location_id?: IdPatch;
  department_id?: string;
}

/** payload + user_id ที่ hook เอาไปประกอบ URL (ไม่ถูกส่งไปใน body) */
export type UpdateUserDto = UpdateUserPayload & { user_id: string };

/** แผนกแบบย่อที่ผูกกับผู้ใช้ — endpoint ส่งมาแค่ id กับชื่อ ไม่มีรหัสแผนก */
export interface DepartmentRef {
  id: string;
  name: string;
}

// --- User × Role matrix (GET /api/config/{bu}/user-application-roles) ---

/** แถว user พร้อม role ที่ถือ — ใช้ทำรายงาน print/CSV หน้า user */
export interface UserApplicationRole {
  user_id: string;
  username: string;
  email: string;
  firstname: string;
  middlename: string;
  lastname: string;
  /** สิทธิ์ระดับ BU: "admin" | "user" (ค่าอื่นแสดงดิบ) */
  bu_role: string;
  is_active: boolean;
  is_bu_active: boolean;
  role_ids: string[];
}

/** role catalog ของ BU จาก summary ของ endpoint เดียวกัน */
export interface UserRoleSummaryRole {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}
