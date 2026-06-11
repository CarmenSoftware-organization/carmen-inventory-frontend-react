export interface BusinessType {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBusinessTypeDto {
  name: string;
  is_active: boolean;
}
