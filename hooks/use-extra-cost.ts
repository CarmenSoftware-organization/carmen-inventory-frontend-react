import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { ExtraCost, CreateExtraCostDto } from "@/types/extra-cost";

const crud = createConfigCrud<ExtraCost, CreateExtraCostDto>({
  queryKey: QUERY_KEYS.EXTRA_COSTS,
  endpoint: API_ENDPOINTS.EXTRA_COST_TYPES,
  label: "extra cost",
  updateMethod: "PATCH",
});

export const useExtraCost = crud.useList;

export const useCreateExtraCost = crud.useCreate;

export const useUpdateExtraCost = crud.useUpdate;

export const useDeleteExtraCost = crud.useDelete;
