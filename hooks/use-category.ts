import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { CategoryDto, CreateCategoryDto } from "@/types/category";

const crud = createConfigCrud<CategoryDto, CreateCategoryDto>({
  queryKey: QUERY_KEYS.PRODUCT_CATEGORIES,
  endpoint: API_ENDPOINTS.PRODUCT_CATEGORIES,
  label: "category",
});

export const useCategory = crud.useList;

export const useCategoryById = crud.useById;

export const useCreateCategory = crud.useCreate;

export const useUpdateCategory = crud.useUpdate;

export const useDeleteCategory = crud.useDelete;
