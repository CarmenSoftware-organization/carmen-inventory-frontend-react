import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Location, CreateLocationDto } from "@/types/location";

const crud = createConfigCrud<Location, CreateLocationDto>({
  queryKey: QUERY_KEYS.LOCATIONS,
  endpoint: API_ENDPOINTS.LOCATIONS,
  label: "location",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการ Location แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน `LookupLocation`, หน้า config
 * และ inventory/store-operation ที่ต้องระบุ location
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Location>
 * @example
 * ```ts
 * const { data } = useLocation({ perpage: -1 });
 * ```
 */
export const useLocation = crud.useList;

/**
 * Alias ของ {@link useLocation} สื่อความหมายว่าเป็น lookup จาก config endpoint
 * (`/api/config/${buCode}/locations`) ใช้กับ filter/lookup ที่ต้องการ list ทั้งหมด
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม (เช่น `enabled`)
 * @returns UseQueryResult ของ PaginatedResponse<Location>
 * @example
 * ```ts
 * const { data } = useConfigLocation({ perpage: -1 }, { enabled: open });
 * ```
 */
export const useConfigLocation = crud.useList;

/**
 * Hook ดึง Location ตาม id
 *
 * @param id - id ของ location
 * @returns UseQueryResult ของ Location
 * @example
 * ```ts
 * const { data } = useLocationById(params.id);
 * ```
 */
export const useLocationById = crud.useById;

/**
 * Hook สำหรับสร้าง Location ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateLocation().mutate({ code: "L01", name: "Main Store" });
 * ```
 */
export const useCreateLocation = crud.useCreate;

/**
 * Hook สำหรับแก้ไข Location
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateLocation().mutate({ id, code: "L02", name: "Kitchen" });
 * ```
 */
export const useUpdateLocation = crud.useUpdate;

/**
 * Hook สำหรับลบ Location
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteLocation().mutate(loc.id);
 * ```
 */
export const useDeleteLocation = crud.useDelete;
