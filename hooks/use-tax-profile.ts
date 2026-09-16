import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { TaxProfile, CreateTaxProfileDto } from "@/types/tax-profile";

const crud = createConfigCrud<TaxProfile, CreateTaxProfileDto>({
  queryKey: QUERY_KEYS.TAX_PROFILES,
  endpoint: API_ENDPOINTS.TAX_PROFILES,
  label: "tax profile",
  updateMethod: "PATCH",
});

export const useTaxProfile = crud.useList;

export const useCreateTaxProfile = crud.useCreate;

export const useUpdateTaxProfile = crud.useUpdate;

export const useDeleteTaxProfile = crud.useDelete;
