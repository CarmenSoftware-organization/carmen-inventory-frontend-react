export interface UserDetail {
  user_id: string;
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  application_roles: { application_role_id: string }[];
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

export interface DepartmentRef {
  id: string;
  code: string;
  name: string;
}

export interface UserDepartmentResponse {
  department: DepartmentRef | null;
  hod_departments: DepartmentRef[];
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
