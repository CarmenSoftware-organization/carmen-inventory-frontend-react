import { createConfigCrud } from "@/hooks/use-config-crud";
import { LOOKUP_QUERY_ROOT } from "@/hooks/use-lookup-resource";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Currency, CreateCurrencyDto } from "@/types/currency";

const crud = createConfigCrud<Currency, CreateCurrencyDto>({
  queryKey: QUERY_KEYS.CURRENCIES,
  endpoint: API_ENDPOINTS.CURRENCIES,
  label: "currency",
  updateMethod: "PATCH",
  // lookup อ่านฟิลด์เพิ่มของ resource นี้ — แก้แล้วต้องไม่ค้างใน cache ของ Lookup API
  extraInvalidateKeys: [LOOKUP_QUERY_ROOT],
});

export const useCurrency = crud.useList;
export const useCurrencyAll = crud.useListAll;

export const useCreateCurrency = crud.useCreate;

export const useUpdateCurrency = crud.useUpdate;

export const useDeleteCurrency = crud.useDelete;
