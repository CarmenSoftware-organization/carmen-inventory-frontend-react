import { useQuery } from "@tanstack/react-query";
import { createConfigCrud } from "@/hooks/use-config-crud";
import { httpClient } from "@/lib/http-client";
import { useBuCode } from "@/hooks/use-bu-code";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  PhysicalCountPeriod,
  CreatePhysicalCountPeriodDto,
} from "@/types/physical-count-period";
import type { CurrentPeriodResponse, CurrentPeriodData } from "@/types/physical-count";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

const crud = createConfigCrud<PhysicalCountPeriod, CreatePhysicalCountPeriodDto>(
  {
    queryKey: QUERY_KEYS.PHYSICAL_COUNT_PERIODS,
    endpoint: API_ENDPOINTS.PHYSICAL_COUNT_PERIODS,
    label: "physical count period",
    updateMethod: "PATCH",
  },
);

/**
 * Hook ดึงรายการงวดตรวจนับสต็อก (physical count period) แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน inventory-management > physical count
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<PhysicalCountPeriod>
 * @example
 * ```ts
 * const { data } = usePhysicalCountPeriod({ page: 1, perpage: 20 });
 * ```
 */
export const usePhysicalCountPeriod = crud.useList;

/**
 * Hook ดึงข้อมูลงวดตรวจนับตาม id
 *
 * @param id - id ของงวด
 * @returns UseQueryResult ของ PhysicalCountPeriod
 * @example
 * ```ts
 * const { data } = usePhysicalCountPeriodById(params.id);
 * ```
 */
export const usePhysicalCountPeriodById = crud.useById;

/**
 * Hook สำหรับสร้างงวดตรวจนับใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreatePhysicalCountPeriod().mutate({ code: "PC-01", start_date: "...", end_date: "..." });
 * ```
 */
export const useCreatePhysicalCountPeriod = crud.useCreate;

/**
 * Hook สำหรับแก้ไขงวดตรวจนับ
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdatePhysicalCountPeriod().mutate({ id, code: "PC-02" });
 * ```
 */
export const useUpdatePhysicalCountPeriod = crud.useUpdate;

/**
 * Hook สำหรับลบงวดตรวจนับ
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeletePhysicalCountPeriod().mutate(p.id);
 * ```
 */
export const useDeletePhysicalCountPeriod = crud.useDelete;

/**
 * Hook ดึงงวดตรวจนับสต็อกปัจจุบัน พร้อมตัวเลือกรวมรายการที่ยังไม่ได้นับ
 *
 * ใช้ cache profile `CACHE_DYNAMIC` (1 นาที) เพราะข้อมูล real-time
 * query key รวม `includeNotCount` เพื่อแยก cache ตาม flag
 *
 * @param includeNotCount - ให้รวมรายการที่ยังไม่นับหรือไม่ (default false)
 * @returns UseQueryResult ของ CurrentPeriodData
 * @example
 * ```ts
 * const { data } = usePhysicalCountPeriodCurrent(true);
 * ```
 */
export function usePhysicalCountPeriodCurrent(includeNotCount = false) {
  const buCode = useBuCode();

  return useQuery<CurrentPeriodData>({
    queryKey: [QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT, buCode, includeNotCount],
    queryFn: async () => {
      const url = `${API_ENDPOINTS.PHYSICAL_COUNT_PERIOD_CURRENT(buCode!)}?include_not_count=${includeNotCount}`;
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch current period");
      const json: CurrentPeriodResponse = await res.json();
      return json.data;
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงรายละเอียดของงวดตรวจนับสต็อกตาม periodId
 *
 * ใช้ cache dynamic (1 นาที) enabled เมื่อทั้ง buCode และ periodId พร้อม
 *
 * @param periodId - รหัสงวด
 * @param includeNotCount - ให้รวมรายการที่ยังไม่นับหรือไม่ (default false)
 * @returns UseQueryResult ของ CurrentPeriodData
 * @example
 * ```ts
 * const { data } = usePhysicalCountPeriodDetail(periodId, false);
 * ```
 */
export function usePhysicalCountPeriodDetail(periodId: string | undefined, includeNotCount = false) {
  const buCode = useBuCode();

  return useQuery<CurrentPeriodData>({
    queryKey: [QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT, buCode, "detail", periodId, includeNotCount],
    queryFn: async () => {
      const url = `${API_ENDPOINTS.PHYSICAL_COUNT_PERIOD_DETAIL(buCode!, periodId!)}?include_not_count=${includeNotCount}`;
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch period detail");
      const json: CurrentPeriodResponse = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!periodId,
    ...CACHE_DYNAMIC,
  });
}
