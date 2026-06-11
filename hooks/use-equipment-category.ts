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

/**
 * Hook ดึงรายการหมวดหมู่อุปกรณ์แบบแบ่งหน้า
 *
 * Re-export จาก factory สำหรับ equipment category
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<EquipmentCategory>
 * @example
 * ```ts
 * const { data } = useEquipmentCategory({ page: 1, perpage: 20 });
 * ```
 */
export const useEquipmentCategory = crud.useList;

/**
 * Hook ดึงหมวดหมู่อุปกรณ์ตาม id
 *
 * @param id - id ของหมวดหมู่
 * @returns UseQueryResult ของ EquipmentCategory
 * @example
 * ```ts
 * const { data } = useEquipmentCategoryById(params.id);
 * ```
 */
export const useEquipmentCategoryById = crud.useById;

/**
 * Hook สำหรับสร้างหมวดหมู่อุปกรณ์ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateEquipmentCategory().mutate({ code: "C01", name: "Baking" });
 * ```
 */
export const useCreateEquipmentCategory = crud.useCreate;

/**
 * Hook สำหรับแก้ไขหมวดหมู่อุปกรณ์
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateEquipmentCategory().mutate({ id, code: "C02", name: "Prep" });
 * ```
 */
export const useUpdateEquipmentCategory = crud.useUpdate;

/**
 * Hook สำหรับลบหมวดหมู่อุปกรณ์
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteEquipmentCategory().mutate(c.id);
 * ```
 */
export const useDeleteEquipmentCategory = crud.useDelete;
