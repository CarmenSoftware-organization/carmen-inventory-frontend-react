import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { CategoryDto, CreateCategoryDto } from "@/types/category";

const crud = createConfigCrud<CategoryDto, CreateCategoryDto>({
  queryKey: QUERY_KEYS.PRODUCT_CATEGORIES,
  endpoint: API_ENDPOINTS.PRODUCT_CATEGORIES,
  label: "category",
});

/**
 * Hook ดึงรายการ product category แบบแบ่งหน้า
 *
 * Re-export จาก `createConfigCrud.useList` ของ product category
 * cache 30 นาที ผูกกับ buCode
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<CategoryDto>
 * @example
 * ```ts
 * const { data } = useCategory({ page: 1, perpage: 20 });
 * ```
 */
export const useCategory = crud.useList;

/**
 * Hook ดึง product category ตาม id
 *
 * ใช้ในหน้า edit โหลดข้อมูลเดิมก่อนแสดงฟอร์ม
 *
 * @param id - id ของ category
 * @returns UseQueryResult ของ CategoryDto
 * @example
 * ```ts
 * const { data } = useCategoryById(params.id);
 * ```
 */
export const useCategoryById = crud.useById;

/**
 * Hook สำหรับสร้าง product category ใหม่
 *
 * invalidate list หลังสำเร็จ
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * const create = useCreateCategory();
 * create.mutate({ code: "C01", name: "Beverage" });
 * ```
 */
export const useCreateCategory = crud.useCreate;

/**
 * Hook สำหรับแก้ไข product category
 *
 * รับ `{ id, ...data }` invalidate list
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * const update = useUpdateCategory();
 * update.mutate({ id, code: "C02", name: "Food" });
 * ```
 */
export const useUpdateCategory = crud.useUpdate;

/**
 * Hook สำหรับลบ product category
 *
 * ใช้คู่กับ `DeleteDialog`
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * const del = useDeleteCategory();
 * del.mutate(cat.id);
 * ```
 */
export const useDeleteCategory = crud.useDelete;
