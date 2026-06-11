import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { AdjustmentType, CreateAdjustmentTypeDto } from "@/types/adjustment-type";

const crud = createConfigCrud<AdjustmentType, CreateAdjustmentTypeDto>({
  queryKey: QUERY_KEYS.ADJUSTMENT_TYPES,
  endpoint: API_ENDPOINTS.ADJUSTMENT_TYPES,
  label: "adjustment type",
});

/**
 * Hook ดึงรายการ adjustment type แบบแบ่งหน้า
 *
 * เป็น re-export จาก `createConfigCrud.useList` ของ module adjustment type
 * ใช้ cache profile `CACHE_STATIC` (30 นาที) ผูกกับ buCode ปัจจุบัน
 * รองรับ params pagination/search/filter มาตรฐาน
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - ตัวเลือก UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<AdjustmentType>
 * @example
 * ```ts
 * const { data, isLoading } = useAdjustmentType({ page: 1, perpage: 20 });
 * ```
 */
export const useAdjustmentType = crud.useList;

/**
 * Hook ดึง adjustment type ตาม id
 *
 * ใช้ใน page edit สำหรับโหลดข้อมูลเดิมของ adjustment type
 * enabled เป็น false เมื่อ id หรือ buCode ยังไม่พร้อม
 *
 * @param id - id ของ adjustment type
 * @returns UseQueryResult ของ AdjustmentType
 * @example
 * ```ts
 * const { data } = useAdjustmentTypeById(params.id);
 * ```
 */
export const useAdjustmentTypeById = crud.useById;

/**
 * Hook สำหรับสร้าง adjustment type ใหม่
 *
 * invalidate list query อัตโนมัติเมื่อสำเร็จ error ถูก normalize เป็น `ApiError`
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * const create = useCreateAdjustmentType();
 * create.mutate({ code: "ADJ01", name: "Stock In" });
 * ```
 */
export const useCreateAdjustmentType = crud.useCreate;

/**
 * Hook สำหรับแก้ไข adjustment type
 *
 * รับ payload `{ id, ...data }` ส่งเป็น PUT invalidate list หลังสำเร็จ
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * const update = useUpdateAdjustmentType();
 * update.mutate({ id, code: "ADJ02", name: "Stock Out" });
 * ```
 */
export const useUpdateAdjustmentType = crud.useUpdate;

/**
 * Hook สำหรับลบ adjustment type
 *
 * รับ id string เรียก DELETE ใช้ร่วมกับ `DeleteDialog` + `isPending`
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * const del = useDeleteAdjustmentType();
 * del.mutate(type.id);
 * ```
 */
export const useDeleteAdjustmentType = crud.useDelete;
