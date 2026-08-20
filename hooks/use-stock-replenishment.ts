import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import type { Locations } from "@/types/stock-replenishment";

/**
 * Hook ดึงข้อมูล stock replenishment รายการสินค้าที่ต้องเติมจัดกลุ่มตาม location
 * ยิง `GET /api/{bu}/stock-replenishment` คืนเฉพาะ `data` (envelope มี summary/paginate
 * ด้วยแต่หน้า list คำนวณสรุปเองจากผล filter ฝั่ง client จึงยังไม่ใช้)
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) จะไม่ fetch จนกว่า buCode จะพร้อม
 * @returns ผลลัพธ์ useQuery ของ Locations (location และรายการเติมสต็อก)
 * @example
 * const { data } = useStockReplenishment();
 */
export function useStockReplenishment() {
  const buCode = useBuCode();

  return useQuery<Locations>({
    queryKey: [QUERY_KEYS.STOCK_REPLENISHMENT, buCode],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        API_ENDPOINTS.STOCK_REPLENISHMENT(buCode),
      );
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to fetch stock replenishment");
      }
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}
