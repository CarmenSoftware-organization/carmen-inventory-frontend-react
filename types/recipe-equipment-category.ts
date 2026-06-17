export interface RecipeEquipmentCategory {
  id: string;
  doc_version: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRecipeEquipmentCategoryDto {
  doc_version?: number;
  name: string;
  description: string;
  is_active: boolean;
}
