import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Unit, CreateUnitDto } from "@/types/unit";

const crud = createConfigCrud<Unit, CreateUnitDto>({
  queryKey: QUERY_KEYS.UNITS,
  endpoint: API_ENDPOINTS.UNITS,
  label: "unit",
});

export const useUnit = crud.useList;

export const useCreateUnit = crud.useCreate;

export const useUpdateUnit = crud.useUpdate;

export const useDeleteUnit = crud.useDelete;
