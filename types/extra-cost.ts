export interface ExtraCost {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateExtraCostDto {
  name: string;
  is_active: boolean;
}
