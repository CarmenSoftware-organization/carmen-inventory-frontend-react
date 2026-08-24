import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import type { Locations } from "@/types/stock-replenishment";

export function useStockReplenishment() {
  const buCode = useBuCode();

  return useQuery<Locations>({
    queryKey: [QUERY_KEYS.STOCK_REPLENISHMENT, buCode],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        API_ENDPOINTS.STOCK_REPLENISHMENT(buCode),
      );
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to fetch stock replenishment");
      }
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}
