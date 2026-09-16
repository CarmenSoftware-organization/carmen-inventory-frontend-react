import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { CnReason, CreateCnReasonDto } from "@/types/cn-reason";

const crud = createConfigCrud<CnReason, CreateCnReasonDto>({
  queryKey: QUERY_KEYS.CN_REASONS_CONFIG,
  endpoint: API_ENDPOINTS.CN_REASONS_CONFIG,
  label: "credit note reason",
});

export const useCnReasonConfig = crud.useList;

export const useCnReasonConfigById = crud.useById;

export const useCreateCnReasonConfig = crud.useCreate;

export const useUpdateCnReasonConfig = crud.useUpdate;

export const useDeleteCnReasonConfig = crud.useDelete;
