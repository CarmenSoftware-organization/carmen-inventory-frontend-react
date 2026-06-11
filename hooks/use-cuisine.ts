import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Cuisine, CreateCuisineDto } from "@/types/cuisine";

const crud = createConfigCrud<Cuisine, CreateCuisineDto>({
  queryKey: QUERY_KEYS.CUISINES,
  endpoint: API_ENDPOINTS.CUISINES,
  label: "cuisine",
});

/**
 * Hook ดึงรายการ cuisine แบบแบ่งหน้า
 *
 * Re-export จาก factory สำหรับ cuisine (ประเภทอาหาร)
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Cuisine>
 * @example
 * ```ts
 * const { data } = useCuisine({ page: 1, perpage: 20 });
 * ```
 */
export const useCuisine = crud.useList;

/**
 * Hook ดึง cuisine ตาม id
 *
 * @param id - id ของ cuisine
 * @returns UseQueryResult ของ Cuisine
 * @example
 * ```ts
 * const { data } = useCuisineById(params.id);
 * ```
 */
export const useCuisineById = crud.useById;

/**
 * Hook สำหรับสร้าง cuisine ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateCuisine().mutate({ code: "TH", name: "Thai" });
 * ```
 */
export const useCreateCuisine = crud.useCreate;

/**
 * Hook สำหรับแก้ไข cuisine
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateCuisine().mutate({ id, code: "JP", name: "Japanese" });
 * ```
 */
export const useUpdateCuisine = crud.useUpdate;

/**
 * Hook สำหรับลบ cuisine
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteCuisine().mutate(c.id);
 * ```
 */
export const useDeleteCuisine = crud.useDelete;
