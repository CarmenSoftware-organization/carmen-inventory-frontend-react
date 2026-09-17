import type { Audit } from "./audit";
import type { EntityRef } from "./entity-ref";

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
  // ยืนยันจาก live `/application-roles` (list เท่านั้น — detail ไม่มีฟิลด์นี้เลย):
  // business_unit เป็น object {id} ไม่มี name คู่กัน ยังไม่มี call site อ่านจริง
  business_unit: EntityRef | null;
  name: string;
  description: string | null;
  permissions: { count: number };
  audit?: Audit;
}

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
