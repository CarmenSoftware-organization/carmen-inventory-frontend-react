import type { Audit } from "./audit";
import type { TransferPayload } from "@/types/transfer";

interface DepartmentUser {
  id: string;
  user_id: string;
  firstname: string;
  lastname: string;
  middlename: string | null;
  telephone: string;
}

export interface Department {
  id: string;
  doc_version: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  account_code?: string;
  department_users: DepartmentUser[];
  hod_users: DepartmentUser[];
  audit?: Audit;
}

export interface CreateDepartmentDto {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  account_code?: string;
  department_users: TransferPayload;
  hod_users: TransferPayload;
  doc_version?: number;
}
