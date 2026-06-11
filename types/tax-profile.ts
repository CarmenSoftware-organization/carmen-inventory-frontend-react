export interface TaxProfile {
  id: string;
  name: string;
  tax_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaxProfileDto {
  name: string;
  tax_rate: number;
  is_active: boolean;
}
