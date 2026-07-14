import type { TransferPayload } from "@/types/transfer";

export interface DepartmentUser {
  id: string;
  user_id: string;
  firstname: string;
  lastname: string;
  middlename: string | null;
  telephone: string;
}

export interface Department {
  id: string;
  /** Optimistic-concurrency token — the backend requires it back on PATCH update. */
  doc_version: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  account_code?: string;
  department_users: DepartmentUser[];
  hod_users: DepartmentUser[];
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentDto {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  account_code?: string;
  department_users: TransferPayload;
  hod_users: TransferPayload;
  /** Only sent on update (PATCH) for optimistic concurrency; absent on create. */
  doc_version?: number;
}
