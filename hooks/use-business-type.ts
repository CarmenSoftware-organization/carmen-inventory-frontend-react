import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { BusinessType, CreateBusinessTypeDto } from "@/types/business-type";

const crud = createConfigCrud<BusinessType, CreateBusinessTypeDto>({
  queryKey: QUERY_KEYS.BUSINESS_TYPES,
  endpoint: API_ENDPOINTS.VENDOR_BUSINESS_TYPES,
  label: "business type",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการ business type แบบแบ่งหน้า
 *
 * Re-export จาก `createConfigCrud.useList` ของ vendor business type
 * cache 30 นาที (CACHE_STATIC) ผูกกับ buCode ปัจจุบัน
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<BusinessType>
 * @example
 * ```ts
 * const { data } = useBusinessType({ page: 1, perpage: 20 });
 * ```
 */
export const useBusinessType = crud.useList;

/**
 * Hook สำหรับสร้าง business type ใหม่
 *
 * invalidate list หลังสำเร็จ error เป็น `ApiError`
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * const create = useCreateBusinessType();
 * create.mutate({ code: "BT01", name: "Retail" });
 * ```
 */
export const useCreateBusinessType = crud.useCreate;

/**
 * Hook สำหรับแก้ไข business type
 *
 * ส่งเป็น PATCH invalidate list หลังสำเร็จ
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * const update = useUpdateBusinessType();
 * update.mutate({ id, code: "BT02", name: "Wholesale" });
 * ```
 */
export const useUpdateBusinessType = crud.useUpdate;

/**
 * Hook สำหรับลบ business type
 *
 * รับ id string ใช้คู่กับ `DeleteDialog`
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * const del = useDeleteBusinessType();
 * del.mutate(bt.id);
 * ```
 */
export const useDeleteBusinessType = crud.useDelete;
