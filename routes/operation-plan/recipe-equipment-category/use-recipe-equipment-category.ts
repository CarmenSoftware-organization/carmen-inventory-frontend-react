import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  RecipeEquipmentCategory,
  CreateRecipeEquipmentCategoryDto,
} from "@/types/recipe-equipment-category";

const crud = createConfigCrud<
  RecipeEquipmentCategory,
  CreateRecipeEquipmentCategoryDto
>({
  queryKey: QUERY_KEYS.RECIPE_EQUIPMENT_CATEGORIES,
  endpoint: API_ENDPOINTS.RECIPE_EQUIPMENT_CATEGORIES,
  label: "recipe-equipment-category",
});

export const useRecipeEquipmentCategory = crud.useList;

export const useRecipeEquipmentCategoryById = crud.useById;

export const useCreateRecipeEquipmentCategory = crud.useCreate;

export const useUpdateRecipeEquipmentCategory = crud.useUpdate;

export const useDeleteRecipeEquipmentCategory = crud.useDelete;
