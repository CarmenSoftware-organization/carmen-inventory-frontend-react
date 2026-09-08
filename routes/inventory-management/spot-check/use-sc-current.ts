import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  SpotCheckLocation,
  SpotCheckCurrentResponse,
} from "@/types/spot-check";

/**
 * Hook ดึงรายการ location ปัจจุบันที่ต้องทำ spot check
 * รองรับ query param include_not_count และใช้ CACHE_DYNAMIC (1 นาที)
 *
 * @param includeNotCount - รวม location ที่ยังไม่ได้นับหรือไม่ (default false)
 * @returns ผลลัพธ์ useQuery ของ SpotCheckLocation[]
 * @example
 * const { data: locations } = useSpotCheckCurrent(true);
 */
export function useSpotCheckCurrent(includeNotCount = false) {
  const buCode = useBuCode();

  return useQuery<SpotCheckLocation[]>({
    queryKey: [QUERY_KEYS.SPOT_CHECK_CURRENT, buCode, includeNotCount],
    queryFn: async () => {
      const url = `${API_ENDPOINTS.SPOT_CHECK_CURRENT(buCode!)}?include_not_count=${includeNotCount}`;
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch spot check locations");
      const json: SpotCheckCurrentResponse = await res.json();
      return json.data;
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}
