import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Cuisine, CreateCuisineDto } from "@/types/cuisine";

const crud = createConfigCrud<Cuisine, CreateCuisineDto>({
  queryKey: QUERY_KEYS.CUISINES,
  endpoint: API_ENDPOINTS.CUISINES,
  label: "cuisine",
});

export const useCuisine = crud.useList;

export const useCuisineById = crud.useById;

export const useCreateCuisine = crud.useCreate;

export const useUpdateCuisine = crud.useUpdate;

export const useDeleteCuisine = crud.useDelete;
