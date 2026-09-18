import type { Audit } from "./audit";

export interface BusinessType {
  id: string;
  doc_version: number;
  name: string;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateBusinessTypeDto {
  name: string;
  is_active: boolean;
  doc_version?: number;
}
