import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Shelf, CreateShelfDto } from "@/types/shelf";

// backend ยังไม่มี /shelves — หน้า /config/shelf สร้างรอ contract นี้ไว้
// (ทรงเดียวกับ config entity อื่น) list จะ error จนกว่า backend จะลง endpoint
const crud = createConfigCrud<Shelf, CreateShelfDto>({
  queryKey: QUERY_KEYS.SHELVES,
  endpoint: API_ENDPOINTS.SHELVES,
  label: "shelf",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการ shelf แบบแบ่งหน้า
 *
 * Re-export จาก `createConfigCrud.useList` ผูกกับ buCode ปัจจุบัน
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Shelf>
 * @example
 * ```ts
 * const { data } = useShelf({ page: 1, perpage: 20 });
 * ```
 */
export const useShelf = crud.useList;

/**
 * Hook สำหรับสร้าง shelf ใหม่ — invalidate list หลังสำเร็จ error เป็น `ApiError`
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * const create = useCreateShelf();
 * create.mutate({ name: "A1", is_active: true });
 * ```
 */
export const useCreateShelf = crud.useCreate;

/**
 * Hook สำหรับแก้ไข shelf — ส่งเป็น PATCH invalidate list หลังสำเร็จ
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * const update = useUpdateShelf();
 * update.mutate({ id, name: "A2" });
 * ```
 */
export const useUpdateShelf = crud.useUpdate;

/**
 * Hook สำหรับลบ shelf — รับ id string ใช้คู่กับ `DeleteDialog`
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * const del = useDeleteShelf();
 * del.mutate(shelf.id);
 * ```
 */
export const useDeleteShelf = crud.useDelete;
