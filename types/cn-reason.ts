import type { Audit } from "./audit";

export interface CnReason {
  id: string;
  doc_version: number;
  name: string;
  description: string;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateCnReasonDto {
  doc_version?: number;
  name: string;
  description: string;
}
