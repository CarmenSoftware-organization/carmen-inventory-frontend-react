import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { CnReason, CreateCnReasonDto } from "@/types/cn-reason";

const crud = createConfigCrud<CnReason, CreateCnReasonDto>({
  queryKey: QUERY_KEYS.CN_REASONS_CONFIG,
  endpoint: API_ENDPOINTS.CN_REASONS_CONFIG,
  label: "credit note reason",
});

/**
 * Hook ดึงรายการ CN reason (สำหรับหน้า config module)
 *
 * ต่างจาก `useCnReason` ตรงที่ใช้ endpoint `/config/...` สำหรับหน้าตั้งค่า
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<CnReason>
 * @example
 * ```ts
 * const { data } = useCnReasonConfig({ page: 1, perpage: 20 });
 * ```
 */
export const useCnReasonConfig = crud.useList;

/**
 * Hook ดึง CN reason (config) ตาม id
 *
 * ใช้ในหน้า config edit
 *
 * @param id - id ของ CN reason
 * @returns UseQueryResult ของ CnReason
 * @example
 * ```ts
 * const { data } = useCnReasonConfigById(params.id);
 * ```
 */
export const useCnReasonConfigById = crud.useById;

/**
 * Hook สำหรับสร้าง CN reason (config) ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateCnReasonConfig().mutate({ code: "R01", description: "..." });
 * ```
 */
export const useCreateCnReasonConfig = crud.useCreate;

/**
 * Hook สำหรับแก้ไข CN reason (config)
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateCnReasonConfig().mutate({ id, code: "R02", description: "..." });
 * ```
 */
export const useUpdateCnReasonConfig = crud.useUpdate;

/**
 * Hook สำหรับลบ CN reason (config)
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteCnReasonConfig().mutate(id);
 * ```
 */
export const useDeleteCnReasonConfig = crud.useDelete;
