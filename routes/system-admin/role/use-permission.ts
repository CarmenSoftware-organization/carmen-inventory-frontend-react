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

/**
 * Hook ดึงรายการสิทธิ์ (permissions) ทั้งหมด
 *
 * Re-export จาก factory ใช้ใน system-admin สำหรับจัดการสิทธิ์
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Permission>
 * @example
 * ```ts
 * const { data } = usePermission({ perpage: -1 });
 * ```
 */
export const usePermission = crud.useList;

/**
 * Hook ดึงข้อมูลสิทธิ์ตาม id
 *
 * @param id - id ของ permission
 * @returns UseQueryResult ของ Permission
 * @example
 * ```ts
 * const { data } = usePermissionById(params.id);
 * ```
 */
export const usePermissionById = crud.useById;

/**
 * Hook สำหรับสร้างสิทธิ์ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreatePermission().mutate({ code: "PERM01", name: "View PR" });
 * ```
 */
export const useCreatePermission = crud.useCreate;

/**
 * Hook สำหรับแก้ไขสิทธิ์
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdatePermission().mutate({ id, name: "Approve PR" });
 * ```
 */
export const useUpdatePermission = crud.useUpdate;

/**
 * Hook สำหรับลบสิทธิ์
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeletePermission().mutate(perm.id);
 * ```
 */
export const useDeletePermission = crud.useDelete;
