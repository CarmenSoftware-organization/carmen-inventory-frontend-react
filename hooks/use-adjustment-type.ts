import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  AdjustmentType,
  CreateAdjustmentTypeDto,
} from "@/types/adjustment-type";

const crud = createConfigCrud<AdjustmentType, CreateAdjustmentTypeDto>({
  queryKey: QUERY_KEYS.ADJUSTMENT_TYPES,
  endpoint: API_ENDPOINTS.ADJUSTMENT_TYPES,
  label: "adjustment type",
});

export const useAdjustmentType = crud.useList;

export const useAdjustmentTypeById = crud.useById;

export const useCreateAdjustmentType = crud.useCreate;

export const useUpdateAdjustmentType = crud.useUpdate;

export const useDeleteAdjustmentType = crud.useDelete;
