import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { EcoLabel, CreateEcoLabelDto } from "@/types/eco-label";

const crud = createConfigCrud<EcoLabel, CreateEcoLabelDto>({
  queryKey: QUERY_KEYS.PRODUCT_MASTER_ECO_LABELS,
  endpoint: API_ENDPOINTS.PRODUCT_MASTER_ECO_LABELS,
  label: "eco label",
  updateMethod: "PATCH",
});

export const useEcoLabel = crud.useList;
export const useCreateEcoLabel = crud.useCreate;
export const useUpdateEcoLabel = crud.useUpdate;
export const useDeleteEcoLabel = crud.useDelete;
