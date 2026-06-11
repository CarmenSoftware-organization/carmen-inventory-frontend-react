import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_STATIC } from "@/lib/cache-config";

export interface ProductUnit {
  id: string;
  name: string;
  conversion: number;
}

/**
 * Hook ดึงหน่วยของสินค้าที่ใช้สำหรับการสั่งซื้อ (order units)
 * ใช้ CACHE_STATIC (staleTime 30 นาที) เพราะหน่วยเป็น master data
 * จะไม่ fetch จนกว่า buCode และ productId จะพร้อม
 * @param productId - รหัสสินค้า
 * @returns React Query ของรายการ ProductUnit พร้อมค่า conversion
 * @example
 * const { data: units = [] } = useProductUnits(productId);
 */
export function useProductUnits(productId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<ProductUnit[]>({
    queryKey: [QUERY_KEYS.PRODUCT_UNITS, buCode, productId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCT_UNITS_FOR_ORDER(buCode!, productId!),
      );
      if (!res.ok) throw new Error("Failed to fetch product units");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!productId,
    ...CACHE_STATIC,
  });
}

/**
 * Hook ดึงหน่วยของสินค้าทั้งหมดที่ใช้ได้ (available units)
 * ใช้ใน lookup หน่วยสินค้าในฟอร์ม ใช้ CACHE_STATIC และ guard ด้วย buCode+productId
 * @param productId - รหัสสินค้า
 * @returns React Query ของรายการ ProductUnit ที่ใช้ได้
 * @example
 * const { data: units } = useProductAvailableUnits(productId);
 */
export function useProductAvailableUnits(productId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<ProductUnit[]>({
    queryKey: [QUERY_KEYS.PRODUCT_UNITS, buCode, productId, "available"],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCT_UNITS_AVAILABLE(buCode!, productId!),
      );
      if (!res.ok) throw new Error("Failed to fetch available units");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!productId,
    ...CACHE_STATIC,
  });
}
