import type { Audit } from "./audit";

/** รหัสบัญชีของ BU — master data จาก `GET /api/config/{bu}/account-codes` */
export interface AccountCode {
  id: string;
  doc_version: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateAccountCodeDto {
  doc_version?: number;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}
