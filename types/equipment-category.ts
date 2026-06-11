export interface EquipmentCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEquipmentCategoryDto {
  name: string;
  description: string | null;
  is_active: boolean;
}
