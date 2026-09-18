import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/** ล็อตต้นทุน (cost layer) ของสินค้าในคลังนั้น — หนึ่งแถวคือหนึ่งการเคลื่อนไหวของล็อต */
export interface InventoryCostLayer {
  id: string;
  lot_no: string;
  lot_index: number;
  lot_at_date: string;
  transaction_type: string;
  in_qty: number;
  out_qty: number;
  balance_qty: number;
  cost_per_unit: number;
  total_cost: number;
  /** ต้นทุนเฉลี่ยของ "สินค้า" ไม่ใช่ของล็อต — ทุกแถวส่งค่าเดียวกันมา */
  average_cost_per_unit: number;
}

export interface InventoryTransaction {
  id: string;
  inventory_transaction_id: string;
  doc_type: string;
  doc_id: string;
  location_id: string;
  location_code: string;
  qty: number;
  cost_per_unit: number;
  total_cost: number;
  lot_no: string;
  created_at: string;
}

export interface InventoryBalance {
  on_hand_qty: number;
  on_order_qty: number;
  re_order_qty: number;
  re_stock_qty: number;
  // สามก้อนล่างเป็น optional — ของเก่าที่ cache ไว้หรือ backend รุ่นก่อนไม่มีให้
  cost_layers?: InventoryCostLayer[];
  transactions?: InventoryTransaction[];
  /** ใบสั่งซื้อที่ยังไม่รับของ — backend ยังส่ง [] มาตลอด ยังไม่รู้รูปร่างแถว */
  on_order?: unknown[];
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
