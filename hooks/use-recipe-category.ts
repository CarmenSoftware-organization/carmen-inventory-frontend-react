import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  RecipeCategory,
  CreateRecipeCategoryDto,
} from "@/types/recipe-category";

const crud = createConfigCrud<RecipeCategory, CreateRecipeCategoryDto>({
  queryKey: QUERY_KEYS.RECIPE_CATEGORIES,
  endpoint: API_ENDPOINTS.RECIPE_CATEGORIES,
  label: "recipe category",
});

export const useRecipeCategory = crud.useList;

export const useRecipeCategoryById = crud.useById;

export const useCreateRecipeCategory = crud.useCreate;

export const useUpdateRecipeCategory = crud.useUpdate;

export const useDeleteRecipeCategory = crud.useDelete;
