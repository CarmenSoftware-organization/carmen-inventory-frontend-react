import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Currency, CreateCurrencyDto } from "@/types/currency";

const crud = createConfigCrud<Currency, CreateCurrencyDto>({
  queryKey: QUERY_KEYS.CURRENCIES,
  endpoint: API_ENDPOINTS.CURRENCIES,
  label: "currency",
  updateMethod: "PATCH",
});

export const useCurrency = crud.useList;

export const useCreateCurrency = crud.useCreate;

export const useUpdateCurrency = crud.useUpdate;

export const useDeleteCurrency = crud.useDelete;
