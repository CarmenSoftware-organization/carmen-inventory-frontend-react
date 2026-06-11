import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_NORMAL } from "@/lib/cache-config";

export interface ProductWithMovementAtLocation {
  id: string;
  code: string;
  name: string;
}

export function useProductsWithMovementAtLocation(
  locationId: string | undefined,
) {
  const buCode = useBuCode();

  return useQuery<ProductWithMovementAtLocation[]>({
    queryKey: [QUERY_KEYS.PRODUCTS_WITH_MOVEMENT_AT_LOCATION, buCode, locationId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCTS_WITH_MOVEMENT_AT_LOCATION(buCode!, locationId!),
      );
      if (!res.ok)
        throw new Error("Failed to fetch products with movement at location");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!locationId,
    ...CACHE_NORMAL,
  });
}
