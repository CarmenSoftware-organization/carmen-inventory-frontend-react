import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { CnReason, CreateCnReasonDto } from "@/types/cn-reason";

const crud = createConfigCrud<CnReason, CreateCnReasonDto>({
  queryKey: QUERY_KEYS.CN_REASONS,
  endpoint: API_ENDPOINTS.CN_REASONS,
  label: "credit note reason",
  updateMethod: "PATCH",
});

export const useCnReason = crud.useList;

export const useCnReasonById = crud.useById;

export const useCreateCnReason = crud.useCreate;

export const useUpdateCnReason = crud.useUpdate;

export const useDeleteCnReason = crud.useDelete;
