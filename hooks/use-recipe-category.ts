import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { RecipeCategory, CreateRecipeCategoryDto } from "@/types/recipe-category";

const crud = createConfigCrud<RecipeCategory, CreateRecipeCategoryDto>({
  queryKey: QUERY_KEYS.RECIPE_CATEGORIES,
  endpoint: API_ENDPOINTS.RECIPE_CATEGORIES,
  label: "recipe category",
});

/**
 * Hook ดึงรายการหมวดสูตรอาหาร (recipe category) แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน `LookupRecipeCategory` และหน้า config
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<RecipeCategory>
 * @example
 * ```ts
 * const { data } = useRecipeCategory({ perpage: -1 });
 * ```
 */
export const useRecipeCategory = crud.useList;

/**
 * Hook ดึงหมวดสูตรอาหารตาม id
 *
 * @param id - id ของหมวด
 * @returns UseQueryResult ของ RecipeCategory
 * @example
 * ```ts
 * const { data } = useRecipeCategoryById(params.id);
 * ```
 */
export const useRecipeCategoryById = crud.useById;

/**
 * Hook สำหรับสร้างหมวดสูตรอาหารใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateRecipeCategory().mutate({ code: "C01", name: "Appetizer" });
 * ```
 */
export const useCreateRecipeCategory = crud.useCreate;

/**
 * Hook สำหรับแก้ไขหมวดสูตรอาหาร
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateRecipeCategory().mutate({ id, code: "C02", name: "Main" });
 * ```
 */
export const useUpdateRecipeCategory = crud.useUpdate;

/**
 * Hook สำหรับลบหมวดสูตรอาหาร
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteRecipeCategory().mutate(c.id);
 * ```
 */
export const useDeleteRecipeCategory = crud.useDelete;
