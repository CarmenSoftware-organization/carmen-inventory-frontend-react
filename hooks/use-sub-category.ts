import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { SubCategoryDto, CreateSubCategoryDto } from "@/types/category";

const crud = createConfigCrud<SubCategoryDto, CreateSubCategoryDto>({
  queryKey: QUERY_KEYS.PRODUCT_SUB_CATEGORIES,
  endpoint: API_ENDPOINTS.PRODUCT_SUB_CATEGORIES,
  label: "sub-category",
});

export const useSubCategory = crud.useList;

export const useSubCategoryById = crud.useById;

export const useCreateSubCategory = crud.useCreate;

export const useUpdateSubCategory = crud.useUpdate;

export const useDeleteSubCategory = crud.useDelete;
