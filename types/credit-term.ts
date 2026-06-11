export interface CreditTerm {
  id: string;
  name: string;
  description: string;
  value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCreditTermDto {
  name: string;
  description: string;
  value: number;
  is_active: boolean;
}
