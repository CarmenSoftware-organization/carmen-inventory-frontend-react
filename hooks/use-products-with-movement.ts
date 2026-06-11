import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_NORMAL } from "@/lib/cache-config";

export interface ProductWithMovement {
  id: string;
  code: string;
  name: string;
}

export function useProductsWithMovement() {
  const buCode = useBuCode();

  return useQuery<ProductWithMovement[]>({
    queryKey: [QUERY_KEYS.PRODUCTS_WITH_MOVEMENT, buCode],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCTS_WITH_MOVEMENT(buCode!),
      );
      if (!res.ok) throw new Error("Failed to fetch products with movement");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode,
    ...CACHE_NORMAL,
  });
}
