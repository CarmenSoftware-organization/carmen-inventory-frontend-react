import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Department, CreateDepartmentDto } from "@/types/department";

const crud = createConfigCrud<Department, CreateDepartmentDto>({
  queryKey: QUERY_KEYS.DEPARTMENTS,
  endpoint: API_ENDPOINTS.DEPARTMENTS,
  label: "department",
  updateMethod: "PATCH",
});

export const useDepartment = crud.useList;

export const useDepartmentById = crud.useById;

export const useCreateDepartment = crud.useCreate;

export const useUpdateDepartment = crud.useUpdate;

export const useDeleteDepartment = crud.useDelete;
