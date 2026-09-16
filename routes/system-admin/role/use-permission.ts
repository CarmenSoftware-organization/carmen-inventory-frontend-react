import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";

// TODO: replace with actual Permission type once API shape is confirmed
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Permission = Record<string, any>;
type CreatePermissionDto = Record<string, unknown>;

const crud = createConfigCrud<Permission, CreatePermissionDto>({
  queryKey: QUERY_KEYS.PERMISSIONS,
  endpoint: API_ENDPOINTS.PERMISSIONS,
  label: "permission",
});

export const usePermission = crud.useList;

export const usePermissionById = crud.useById;

export const useCreatePermission = crud.useCreate;

export const useUpdatePermission = crud.useUpdate;

export const useDeletePermission = crud.useDelete;
