import type { Audit } from "./audit";

export interface Certification {
  id: string;
  doc_version: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  audit?: Audit;
}

export interface CreateCertificationDto {
  doc_version?: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
}
