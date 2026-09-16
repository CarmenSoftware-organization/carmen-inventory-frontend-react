import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  EquipmentCategory,
  CreateEquipmentCategoryDto,
} from "@/types/equipment-category";

const crud = createConfigCrud<EquipmentCategory, CreateEquipmentCategoryDto>({
  queryKey: QUERY_KEYS.EQUIPMENT_CATEGORIES,
  endpoint: API_ENDPOINTS.EQUIPMENT_CATEGORIES,
  label: "equipment-category",
});

export const useEquipmentCategory = crud.useList;

export const useEquipmentCategoryById = crud.useById;

export const useCreateEquipmentCategory = crud.useCreate;

export const useUpdateEquipmentCategory = crud.useUpdate;

export const useDeleteEquipmentCategory = crud.useDelete;
