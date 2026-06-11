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

/**
 * Hook ดึงรายการ department แบบแบ่งหน้า
 *
 * Re-export จาก factory สำหรับ department (แผนก)
 * ใช้ใน `LookupDepartment` และหน้า config
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Department>
 * @example
 * ```ts
 * const { data } = useDepartment({ perpage: -1 });
 * ```
 */
export const useDepartment = crud.useList;

/**
 * Hook ดึง department ตาม id
 *
 * @param id - id ของ department
 * @returns UseQueryResult ของ Department
 * @example
 * ```ts
 * const { data } = useDepartmentById(params.id);
 * ```
 */
export const useDepartmentById = crud.useById;

/**
 * Hook สำหรับสร้าง department ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateDepartment().mutate({ code: "D01", name: "F&B" });
 * ```
 */
export const useCreateDepartment = crud.useCreate;

/**
 * Hook สำหรับแก้ไข department
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateDepartment().mutate({ id, code: "D02", name: "HR" });
 * ```
 */
export const useUpdateDepartment = crud.useUpdate;

/**
 * Hook สำหรับลบ department
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteDepartment().mutate(dept.id);
 * ```
 */
export const useDeleteDepartment = crud.useDelete;
