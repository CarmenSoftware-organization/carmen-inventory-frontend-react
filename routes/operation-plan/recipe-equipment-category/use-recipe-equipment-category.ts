import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  RecipeEquipmentCategory,
  CreateRecipeEquipmentCategoryDto,
} from "@/types/recipe-equipment-category";

const crud = createConfigCrud<
  RecipeEquipmentCategory,
  CreateRecipeEquipmentCategoryDto
>({
  queryKey: QUERY_KEYS.RECIPE_EQUIPMENT_CATEGORIES,
  endpoint: API_ENDPOINTS.RECIPE_EQUIPMENT_CATEGORIES,
  label: "recipe-equipment-category",
});

/**
 * Hook ดึงรายการหมวดอุปกรณ์สำหรับสูตรอาหาร (recipe equipment category) แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน recipe module สำหรับเลือก category ของ equipment
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<RecipeEquipmentCategory>
 * @example
 * ```ts
 * const { data } = useRecipeEquipmentCategory({ perpage: -1 });
 * ```
 */
export const useRecipeEquipmentCategory = crud.useList;

/**
 * Hook ดึงหมวดอุปกรณ์สำหรับสูตรอาหารตาม id
 *
 * @param id - id ของหมวด
 * @returns UseQueryResult ของ RecipeEquipmentCategory
 * @example
 * ```ts
 * const { data } = useRecipeEquipmentCategoryById(params.id);
 * ```
 */
export const useRecipeEquipmentCategoryById = crud.useById;

/**
 * Hook สำหรับสร้างหมวดอุปกรณ์สำหรับสูตรอาหารใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateRecipeEquipmentCategory().mutate({ code: "REC01", name: "Baking" });
 * ```
 */
export const useCreateRecipeEquipmentCategory = crud.useCreate;

/**
 * Hook สำหรับแก้ไขหมวดอุปกรณ์สำหรับสูตรอาหาร
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateRecipeEquipmentCategory().mutate({ id, code: "REC02", name: "Prep" });
 * ```
 */
export const useUpdateRecipeEquipmentCategory = crud.useUpdate;

/**
 * Hook สำหรับลบหมวดอุปกรณ์สำหรับสูตรอาหาร
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteRecipeEquipmentCategory().mutate(c.id);
 * ```
 */
export const useDeleteRecipeEquipmentCategory = crud.useDelete;
