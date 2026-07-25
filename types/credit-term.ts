import type { Audit } from "./audit";

export interface CreditTerm {
  id: string;
  doc_version: number;
  name: string;
  description: string;
  value: number;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateCreditTermDto {
  doc_version?: number;
  name: string;
  description: string;
  value: number;
  is_active: boolean;
}
