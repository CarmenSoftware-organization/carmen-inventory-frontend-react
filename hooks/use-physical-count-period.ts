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
import type {
  CurrentPeriodResponse,
  CurrentPeriodData,
} from "@/types/physical-count";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

const crud = createConfigCrud<
  PhysicalCountPeriod,
  CreatePhysicalCountPeriodDto
>({
  queryKey: QUERY_KEYS.PHYSICAL_COUNT_PERIODS,
  endpoint: API_ENDPOINTS.PHYSICAL_COUNT_PERIODS,
  label: "physical count period",
  updateMethod: "PATCH",
});

export const usePhysicalCountPeriod = crud.useList;

export const usePhysicalCountPeriodById = crud.useById;

export const useCreatePhysicalCountPeriod = crud.useCreate;

export const useUpdatePhysicalCountPeriod = crud.useUpdate;

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
    queryKey: [
      QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT,
      buCode,
      includeNotCount,
    ],
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

export function usePhysicalCountPeriodDetail(
  periodId: string | undefined,
  includeNotCount = false,
) {
  const buCode = useBuCode();

  return useQuery<CurrentPeriodData>({
    queryKey: [
      QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT,
      buCode,
      "detail",
      periodId,
      includeNotCount,
    ],
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
