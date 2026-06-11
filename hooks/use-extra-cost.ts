import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { ExtraCost, CreateExtraCostDto } from "@/types/extra-cost";

const crud = createConfigCrud<ExtraCost, CreateExtraCostDto>({
  queryKey: QUERY_KEYS.EXTRA_COSTS,
  endpoint: API_ENDPOINTS.EXTRA_COST_TYPES,
  label: "extra cost",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการประเภทค่าใช้จ่ายเพิ่มเติม (extra cost) แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน GRN/PO สำหรับระบุ extra cost
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<ExtraCost>
 * @example
 * ```ts
 * const { data } = useExtraCost({ perpage: -1 });
 * ```
 */
export const useExtraCost = crud.useList;

/**
 * Hook สำหรับสร้าง extra cost type ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateExtraCost().mutate({ code: "EC01", name: "Freight" });
 * ```
 */
export const useCreateExtraCost = crud.useCreate;

/**
 * Hook สำหรับแก้ไข extra cost type
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateExtraCost().mutate({ id, code: "EC02", name: "Insurance" });
 * ```
 */
export const useUpdateExtraCost = crud.useUpdate;

/**
 * Hook สำหรับลบ extra cost type
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteExtraCost().mutate(ec.id);
 * ```
 */
export const useDeleteExtraCost = crud.useDelete;
