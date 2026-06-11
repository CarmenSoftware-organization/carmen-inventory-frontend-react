import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

export interface OnHandLocationRow {
  location_id: string | null;
  location_code: string | null;
  location_name: string | null;
  location_type: string | null;
  on_hand_qty: number;
  max_qty: number;
  min_qty: number;
  last_counted_date: string | null;
}

export interface ProductOnHandResponse {
  product_id: string;
  product_code: string | null;
  product_name: string | null;
  product_local_name: string | null;
  inventory_unit_id: string | null;
  inventory_unit_name: string | null;
  sku: string | null;
  total_on_hand: number;
  locations: OnHandLocationRow[];
  transactions: unknown[];
}

export function useProductOnHand(
  productId: string | undefined,
  locationId?: string,
) {
  const buCode = useBuCode();

  return useQuery<ProductOnHandResponse>({
    queryKey: [QUERY_KEYS.PRODUCT_ON_HAND, buCode, productId, locationId ?? null],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.PRODUCT_ON_HAND(buCode!, productId!),
        locationId ? { location_id: locationId } : {},
      );
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch on-hand");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!productId,
    ...CACHE_DYNAMIC,
  });
}
