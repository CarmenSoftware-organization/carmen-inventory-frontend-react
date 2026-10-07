import { createConfigCrud } from "@/hooks/use-config-crud";
import { LOOKUP_QUERY_ROOT } from "@/hooks/use-lookup-resource";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Location, CreateLocationDto } from "@/types/location";

const crud = createConfigCrud<Location, CreateLocationDto>({
  queryKey: QUERY_KEYS.LOCATIONS,
  endpoint: API_ENDPOINTS.LOCATIONS,
  label: "location",
  updateMethod: "PATCH",
  // lookup อ่านฟิลด์เพิ่มของ resource นี้ — แก้แล้วต้องไม่ค้างใน cache ของ Lookup API
  extraInvalidateKeys: [LOOKUP_QUERY_ROOT],
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
 * const { data } = useLocation({ search, perpage: 30, filter: "is_active|boolean:true" });
 * ```
 */
export const useLocation = crud.useList;
export const useLocationAll = crud.useListAll;

/**
 * Alias ของ {@link useLocation} สื่อความหมายว่าเป็น lookup จาก config endpoint
 * (`/api/config/${buCode}/locations`) ใช้กับ filter/lookup (โหลดทีละหน้า)
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม (เช่น `enabled`)
 * @returns UseQueryResult ของ PaginatedResponse<Location>
 * @example
 * ```ts
 * const { data } = useConfigLocation({ perpage: 30, page }, { enabled: open });
 * ```
 */
export const useConfigLocation = crud.useList;

export const useLocationById = crud.useById;

export const useCreateLocation = crud.useCreate;

export const useUpdateLocation = crud.useUpdate;

export const useDeleteLocation = crud.useDelete;
