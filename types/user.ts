export interface UserDetail {
  user_id: string;
  firstname: string;
  lastname: string;
  email: string;
  username: string;
  application_roles: { application_role_id: string }[];
}

export interface UpdateUserRolesDto {
  user_id: string;
  application_role_id: {
    add?: string[];
    remove?: string[];
  };
}

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
