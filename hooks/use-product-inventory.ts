import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

export interface InventoryBalance {
  on_hand_qty: number;
  on_order_qty: number;
  re_order_qty: number;
  re_stock_qty: number;
}

/**
 * Hook ดึงยอดสต็อกของสินค้าตาม location ที่กำหนด
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เพราะยอดสต็อกเปลี่ยนจากการเคลื่อนไหวบ่อย
 * จะไม่ fetch จนกว่า buCode, locationId และ productId จะพร้อมทั้งหมด
 * @param buCode - รหัส business unit
 * @param locationId - รหัสคลัง/สถานที่
 * @param productId - รหัสสินค้า
 * @returns React Query ของ InventoryBalance (on hand, on order, re-order, re-stock)
 * @example
 * const { data: bal } = useProductInventory(buCode, locationId, productId);
 */
export function useProductInventory(
  buCode: string | undefined,
  locationId: string | undefined,
  productId: string | undefined,
) {
  return useQuery<InventoryBalance>({
    queryKey: [QUERY_KEYS.PRODUCT_INVENTORY, buCode, locationId, productId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCT_INVENTORY(buCode!, locationId!, productId!),
      );
      if (!res.ok) throw new Error("Failed to fetch inventory");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!locationId && !!productId,
    ...CACHE_DYNAMIC,
  });
}
