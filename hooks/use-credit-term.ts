import { createConfigCrud } from "@/hooks/use-config-crud";
import { LOOKUP_QUERY_ROOT } from "@/hooks/use-lookup-resource";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { CreditTerm, CreateCreditTermDto } from "@/types/credit-term";

const crud = createConfigCrud<CreditTerm, CreateCreditTermDto>({
  queryKey: QUERY_KEYS.CREDIT_TERMS,
  endpoint: API_ENDPOINTS.CREDIT_TERMS,
  label: "credit term",
  updateMethod: "PATCH",
  // lookup อ่านฟิลด์เพิ่มของ resource นี้ — แก้แล้วต้องไม่ค้างใน cache ของ Lookup API
  extraInvalidateKeys: [LOOKUP_QUERY_ROOT],
});

export const useCreditTerm = crud.useList;

export const useCreditTermById = crud.useById;

export const useCreateCreditTerm = crud.useCreate;

export const useUpdateCreditTerm = crud.useUpdate;

export const useDeleteCreditTerm = crud.useDelete;
