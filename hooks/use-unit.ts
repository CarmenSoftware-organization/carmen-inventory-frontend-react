import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Unit, CreateUnitDto } from "@/types/unit";

const crud = createConfigCrud<Unit, CreateUnitDto>({
  queryKey: QUERY_KEYS.UNITS,
  endpoint: API_ENDPOINTS.UNITS,
  label: "unit",
});

/**
 * Hook ดึงรายการหน่วยนับ (unit) แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน `LookupUnit` และหน้า product master/PR/PO
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Unit>
 * @example
 * ```ts
 * const { data } = useUnit({ perpage: -1 });
 * ```
 */
export const useUnit = crud.useList;

/**
 * Hook สำหรับสร้างหน่วยนับใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateUnit().mutate({ code: "KG", name: "Kilogram" });
 * ```
 */
export const useCreateUnit = crud.useCreate;

/**
 * Hook สำหรับแก้ไขหน่วยนับ
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateUnit().mutate({ id, code: "G", name: "Gram" });
 * ```
 */
export const useUpdateUnit = crud.useUpdate;

/**
 * Hook สำหรับลบหน่วยนับ
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteUnit().mutate(u.id);
 * ```
 */
export const useDeleteUnit = crud.useDelete;
