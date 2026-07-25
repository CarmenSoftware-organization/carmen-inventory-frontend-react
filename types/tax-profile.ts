import type { Audit } from "./audit";

export interface TaxProfile {
  id: string;
  name: string;
  tax_rate: number;
  is_active: boolean;
  doc_version: number;
  audit?: Audit;
}

export interface CreateTaxProfileDto {
  name: string;
  tax_rate: number;
  is_active: boolean;
  // optimistic-concurrency token round-tripped on PATCH (omitting it → 400)
  doc_version?: number;
}
