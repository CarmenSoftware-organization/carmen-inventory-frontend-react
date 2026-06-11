import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

export interface OnOrderRow {
  po_id: string | null;
  po_no: string | null;
  vendor_name: string | null;
  order_date: string | null;
  delivery_date: string | null;
  order_qty: number;
  price: number;
  total_amount: number;
  pending_qty: number;
  po_status: string | null;
}

export interface ProductOnOrderResponse {
  product_id: string;
  product_code: string | null;
  product_name: string | null;
  product_local_name: string | null;
  inventory_unit_id: string | null;
  inventory_unit_name: string | null;
  sku: string | null;
  total_on_order: number;
  total_order_amount: number;
  orders: OnOrderRow[];
}

export function useProductOnOrder(productId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<ProductOnOrderResponse>({
    queryKey: [QUERY_KEYS.PRODUCT_ON_ORDER, buCode, productId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCT_ON_ORDER(buCode!, productId!),
      );
      if (!res.ok) throw new Error("Failed to fetch on-order");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!productId,
    ...CACHE_DYNAMIC,
  });
}
