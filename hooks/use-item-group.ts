import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { ItemGroupDto, CreateItemGroupDto } from "@/types/category";

const crud = createConfigCrud<ItemGroupDto, CreateItemGroupDto>({
  queryKey: QUERY_KEYS.PRODUCT_ITEM_GROUPS,
  endpoint: API_ENDPOINTS.PRODUCT_ITEM_GROUPS,
  label: "item-group",
});

/**
 * Hook ดึงรายการ Item Group แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน `LookupItemGroup` และหน้า config
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<ItemGroupDto>
 * @example
 * ```ts
 * const { data } = useItemGroup({ perpage: -1 });
 * ```
 */
export const useItemGroup = crud.useList;

/**
 * Hook ดึง Item Group ตาม id
 *
 * @param id - id ของ item group
 * @returns UseQueryResult ของ ItemGroupDto
 * @example
 * ```ts
 * const { data } = useItemGroupById(params.id);
 * ```
 */
export const useItemGroupById = crud.useById;

/**
 * Hook สำหรับสร้าง Item Group ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateItemGroup().mutate({ code: "IG01", name: "Dry Goods" });
 * ```
 */
export const useCreateItemGroup = crud.useCreate;

/**
 * Hook สำหรับแก้ไข Item Group
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateItemGroup().mutate({ id, code: "IG02", name: "Produce" });
 * ```
 */
export const useUpdateItemGroup = crud.useUpdate;

/**
 * Hook สำหรับลบ Item Group
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteItemGroup().mutate(ig.id);
 * ```
 */
export const useDeleteItemGroup = crud.useDelete;
