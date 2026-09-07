import type { Audit } from "./audit";

interface RolePermission {
  permission_id: string;
  action: string;
  resource: string;
  description: string;
}

/**
 * List item shape from Get All (/application-roles)
 *
 * `permissions` เป็น **จำนวน** ไม่ใช่รายการ — endpoint list ส่งมาแค่ `{ count }`
 * ส่วนสิทธิ์รายตัวอยู่ใน `RoleDetail` ของ Get By ID เท่านั้น
 */
export interface Role {
  id: string;
  business_unit_id: string;
  name: string;
  description: string | null;
  permissions: { count: number };
  audit?: Audit;
}

/** Detail shape from Get By ID — uses `application_role_name` instead of `name` */
export interface RoleDetail {
  id: string;
  doc_version?: number;
  application_role_name: string;
  permissions: RolePermission[];
}

export interface CreateRoleDto {
  doc_version?: number;
  application_role_name: string;
  permissions: { add: string[] };
}

export interface UpdateRoleDto {
  doc_version?: number;
  application_role_name: string;
  permissions: { add: string[]; remove: string[] };
}
