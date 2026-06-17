export interface RolePermission {
  permission_id: string;
  action: string;
  resource: string;
  description: string;
}

/** List item shape from Get All (/application-roles) */
export interface Role {
  id: string;
  business_unit_id: string;
  name: string;
  description: string | null;
  created_at: string;
  permissions: RolePermission[];
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
