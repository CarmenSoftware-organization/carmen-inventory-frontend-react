import type { Audit } from "./audit";

export interface ExtraCost {
  id: string;
  doc_version: number;
  name: string;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateExtraCostDto {
  name: string;
  is_active: boolean;
  doc_version?: number;
}
