import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { SubCategoryDto, CreateSubCategoryDto } from "@/types/category";

const crud = createConfigCrud<SubCategoryDto, CreateSubCategoryDto>({
  queryKey: QUERY_KEYS.PRODUCT_SUB_CATEGORIES,
  endpoint: API_ENDPOINTS.PRODUCT_SUB_CATEGORIES,
  label: "sub-category",
});

/**
 * Hook ดึงรายการ sub-category ของ product แบบแบ่งหน้า
 *
 * Re-export จาก factory เป็นระดับย่อยถัดจาก category
 *
 * @param params - พารามิเตอร์ pagination/search/filter (ต้องส่ง `product_category_id` เพื่อ filter)
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<SubCategoryDto>
 * @example
 * ```ts
 * const { data } = useSubCategory({ filter: `product_category_id:${catId}` });
 * ```
 */
export const useSubCategory = crud.useList;

/**
 * Hook ดึง sub-category ตาม id
 *
 * @param id - id ของ sub-category
 * @returns UseQueryResult ของ SubCategoryDto
 * @example
 * ```ts
 * const { data } = useSubCategoryById(params.id);
 * ```
 */
export const useSubCategoryById = crud.useById;

/**
 * Hook สำหรับสร้าง sub-category ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateSubCategory().mutate({ code: "SC01", name: "Tea", product_category_id });
 * ```
 */
export const useCreateSubCategory = crud.useCreate;

/**
 * Hook สำหรับแก้ไข sub-category
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateSubCategory().mutate({ id, code: "SC02", name: "Coffee" });
 * ```
 */
export const useUpdateSubCategory = crud.useUpdate;

/**
 * Hook สำหรับลบ sub-category
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteSubCategory().mutate(sc.id);
 * ```
 */
export const useDeleteSubCategory = crud.useDelete;
