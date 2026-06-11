import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { CnReason, CreateCnReasonDto } from "@/types/cn-reason";

const crud = createConfigCrud<CnReason, CreateCnReasonDto>({
  queryKey: QUERY_KEYS.CN_REASONS,
  endpoint: API_ENDPOINTS.CN_REASONS,
  label: "credit note reason",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการ credit note reason แบบแบ่งหน้า
 *
 * Re-export จาก factory ของ CN reason ใช้ใน procurement module
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<CnReason>
 * @example
 * ```ts
 * const { data } = useCnReason({ page: 1, perpage: 20 });
 * ```
 */
export const useCnReason = crud.useList;

/**
 * Hook ดึง CN reason ตาม id
 *
 * ใช้ในหน้า edit
 *
 * @param id - id ของ CN reason
 * @returns UseQueryResult ของ CnReason
 * @example
 * ```ts
 * const { data } = useCnReasonById(params.id);
 * ```
 */
export const useCnReasonById = crud.useById;

/**
 * Hook สำหรับสร้าง CN reason ใหม่
 *
 * invalidate list หลังสำเร็จ
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * const create = useCreateCnReason();
 * create.mutate({ code: "R01", description: "Damaged" });
 * ```
 */
export const useCreateCnReason = crud.useCreate;

/**
 * Hook สำหรับแก้ไข CN reason
 *
 * ส่งเป็น PATCH
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * const update = useUpdateCnReason();
 * update.mutate({ id, code: "R02", description: "Wrong item" });
 * ```
 */
export const useUpdateCnReason = crud.useUpdate;

/**
 * Hook สำหรับลบ CN reason
 *
 * ใช้คู่กับ `DeleteDialog`
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * const del = useDeleteCnReason();
 * del.mutate(reason.id);
 * ```
 */
export const useDeleteCnReason = crud.useDelete;
