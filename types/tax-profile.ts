export interface TaxProfile {
  id: string;
  name: string;
  tax_rate: number;
  is_active: boolean;
  doc_version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTaxProfileDto {
  name: string;
  tax_rate: number;
  is_active: boolean;
  // optimistic-concurrency token round-tripped on PATCH (omitting it → 400)
  doc_version?: number;
}
