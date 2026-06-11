import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_NORMAL } from "@/lib/cache-config";

export interface LocationWithMovement {
  id: string;
  code: string;
  name: string;
}

export function useLocationsWithMovement(productId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<LocationWithMovement[]>({
    queryKey: [QUERY_KEYS.LOCATIONS_WITH_MOVEMENT, buCode, productId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.LOCATIONS_WITH_MOVEMENT(buCode!, productId!),
      );
      if (!res.ok) throw new Error("Failed to fetch locations with movement");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!productId,
    ...CACHE_NORMAL,
  });
}
