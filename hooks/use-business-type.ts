import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  BusinessType,
  CreateBusinessTypeDto,
} from "@/types/business-type";

const crud = createConfigCrud<BusinessType, CreateBusinessTypeDto>({
  queryKey: QUERY_KEYS.BUSINESS_TYPES,
  endpoint: API_ENDPOINTS.VENDOR_BUSINESS_TYPES,
  label: "business type",
  updateMethod: "PATCH",
});

export const useBusinessType = crud.useList;

export const useCreateBusinessType = crud.useCreate;

export const useUpdateBusinessType = crud.useUpdate;

export const useDeleteBusinessType = crud.useDelete;
