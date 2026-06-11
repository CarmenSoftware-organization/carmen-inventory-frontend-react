export interface CnReason {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCnReasonDto {
  name: string;
  description: string;
}
