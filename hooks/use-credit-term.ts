import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { CreditTerm, CreateCreditTermDto } from "@/types/credit-term";

const crud = createConfigCrud<CreditTerm, CreateCreditTermDto>({
  queryKey: QUERY_KEYS.CREDIT_TERMS,
  endpoint: API_ENDPOINTS.CREDIT_TERMS,
  label: "credit term",
  updateMethod: "PATCH",
});

export const useCreditTerm = crud.useList;

export const useCreditTermById = crud.useById;

export const useCreateCreditTerm = crud.useCreate;

export const useUpdateCreditTerm = crud.useUpdate;

export const useDeleteCreditTerm = crud.useDelete;
