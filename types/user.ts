import type { INVENTORY_TYPE } from "@/constant/location";

export interface UserAccount {
  username: string;
  email: string;
  alias_name: string;
  is_active: boolean;
  firstname: string;
  middlename: string;
  lastname: string;
  telephone: string;
  avatar_url: string;
}

export interface UserRoleAssignment {
  id: string;
  application_role_id: string;
  application_role_name: string;
  application_role_description: string | null;
  assigned_at: string;
}

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

export type UpdateUserDto = UpdateUserPayload & { user_id: string };

export interface DepartmentRef {
  id: string;
  name: string;
}

// --- User × Role matrix (GET /api/config/{bu}/user-application-roles) ---

export interface UserApplicationRole {
  user_id: string;
  username: string;
  email: string;
  firstname: string;
  middlename: string;
  lastname: string;
  bu_role: string;
  is_active: boolean;
  is_bu_active: boolean;
  role_ids: string[];
}

export interface UserRoleSummaryRole {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}
