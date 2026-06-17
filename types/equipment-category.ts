export interface EquipmentCategory {
  id: string;
  doc_version: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEquipmentCategoryDto {
  doc_version?: number;
  name: string;
  description: string | null;
  is_active: boolean;
}
