export interface CreditTerm {
  id: string;
  doc_version: number;
  name: string;
  description: string;
  value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCreditTermDto {
  doc_version?: number;
  name: string;
  description: string;
  value: number;
  is_active: boolean;
}
