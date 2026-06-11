import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_NORMAL } from "@/lib/cache-config";

export interface LocationWithAnyMovement {
  id: string;
  code: string;
  name: string;
}

export function useLocationsWithAnyMovement() {
  const buCode = useBuCode();

  return useQuery<LocationWithAnyMovement[]>({
    queryKey: [QUERY_KEYS.LOCATIONS_WITH_ANY_MOVEMENT, buCode],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.LOCATIONS_WITH_ANY_MOVEMENT(buCode!),
      );
      if (!res.ok) throw new Error("Failed to fetch locations with movement");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode,
    ...CACHE_NORMAL,
  });
}
