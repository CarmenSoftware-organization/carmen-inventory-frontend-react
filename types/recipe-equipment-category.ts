export interface RecipeEquipmentCategory {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRecipeEquipmentCategoryDto {
  name: string;
  description: string;
  is_active: boolean;
}
