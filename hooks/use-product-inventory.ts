import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/** ราคาต่อหน่วยครั้งล่าสุดที่ของเข้าคลังนี้ พร้อมเอกสารต้นทาง */
export interface InventoryLastPrice {
  cost_per_unit: number;
  doc_type: string;
  doc_id: string;
  at: string;
}

export interface InventoryBalance {
  on_hand_qty: number;
  on_order_qty: number;
  re_order_qty: number;
  re_stock_qty: number;
  inventory_unit_id?: string;
  inventory_unit_name?: string;
  // ของเก่าที่ cache ไว้หรือ backend รุ่นก่อนไม่มีให้ — และยังไม่เคยมีของเข้าคลังนี้
  // ก็ไม่มี last_price เหมือนกัน
  last_price?: InventoryLastPrice | null;
  /** ใบสั่งซื้อที่ยังไม่รับของ — backend ยังส่ง [] มาตลอด ยังไม่รู้รูปร่างแถว */
  on_order?: unknown[];
}

// cost_layers[] กับ transactions[] ยังมากับ response แต่ไม่มีหน้าไหนอ่านแล้ว
// (ตารางล็อต/ความเคลื่อนไหวถูกถอดออกจากกล่องข้อมูลสต็อก) จึงไม่ประกาศ type ทิ้งไว้

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
