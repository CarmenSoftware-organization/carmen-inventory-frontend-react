import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

export interface InventoryMovementRow {
  date: string | null;
  status: string | null;
  in_qty: number;
  out_qty: number;
  total_qty: number;
  cost: number;
  total_cost: number;
  balance_cost: number;
  cost_average: string;
}

export interface InventoryMovementLocationGroup {
  location_id: string | null;
  location_name: string | null;
  location_code: string | null;
  inventory_movement: InventoryMovementRow[];
}

export interface InventoryMovementResponse {
  calculation_method: string;
  locations: InventoryMovementLocationGroup[];
}

export interface UseInventoryMovementParams {
  buCode: string | undefined;
  productId: string | undefined;
  startAt: string | undefined;
  endAt: string | undefined;
  locationId?: string;
}

export function useInventoryMovement({
  buCode,
  productId,
  startAt,
  endAt,
  locationId,
}: UseInventoryMovementParams) {
  return useQuery<InventoryMovementResponse>({
    queryKey: [
      QUERY_KEYS.PRODUCT_INVENTORY_MOVEMENT,
      buCode,
      productId,
      startAt,
      endAt,
      locationId ?? null,
    ],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.PRODUCT_INVENTORY_MOVEMENT(buCode!, productId!),
        {
          start_at: startAt!,
          end_at: endAt!,
          ...(locationId ? { location_id: locationId } : {}),
        },
      );
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch inventory movement");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!productId && !!startAt && !!endAt,
    ...CACHE_DYNAMIC,
  });
}
