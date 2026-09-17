import type { Audit } from "./audit";
import type { TransferPayload } from "@/types/transfer";
import type { EntityRef } from "./entity-ref";

// ยืนยันจาก live `/departments/{id}` — department_users[]/hod_users[] items มี
// user เป็น object {id} (ไม่มี name คู่กัน — firstname/lastname เป็นคนละฟิลด์
// แยกกัน) แทนที่ user_id แบบเดิม เฉพาะ detail (findOne) เท่านั้นที่มี array นี้
interface DepartmentUser {
  id: string;
  user: EntityRef | null;
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
