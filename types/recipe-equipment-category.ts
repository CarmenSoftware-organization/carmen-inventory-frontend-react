export interface RecipeEquipmentCategory {
  id: string;
  doc_version: number;
  name: string;
  description: string;
  is_active: boolean;
}

export interface CreateRecipeEquipmentCategoryDto {
  doc_version?: number;
  name: string;
  description: string;
  is_active: boolean;
}
