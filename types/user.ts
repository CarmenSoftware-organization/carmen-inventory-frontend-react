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
