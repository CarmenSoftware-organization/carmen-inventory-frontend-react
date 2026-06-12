import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { mockData } from "@/routes/store-operation/stock-replenishment/mock-data";
import type { Locations } from "@/types/stock-replenishment";

// TODO: เปลี่ยนเป็นเรียก API จริง เมื่อ backend พร้อม
// import { API_ENDPOINTS } from "@/constant/api-endpoints";
// import { httpClient } from "@/lib/http-client";

/**
 * Hook ดึงข้อมูล stock replenishment ของ location (ปัจจุบันใช้ mock data)
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เตรียมสลับเป็น API จริงเมื่อ backend พร้อม
 * จะไม่ fetch จนกว่า buCode จะพร้อม
 * @returns ผลลัพธ์ useQuery ของ Locations (location และรายการเติมสต็อก)
 * @example
 * const { data } = useStockReplenishment();
 */
export function useStockReplenishment() {
  const buCode = useBuCode();

  return useQuery<Locations>({
    queryKey: [QUERY_KEYS.STOCK_REPLENISHMENT, buCode],
    queryFn: async () => {
      // TODO: เปลี่ยนเป็น API จริง
      return mockData;
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}
