import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { TransactionListResponse } from "@/types/transaction";
import type { ParamsDto } from "@/types/params";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/**
 * Hook ดึงรายการ transaction แบบแบ่งหน้า
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เพราะ transaction เปลี่ยนบ่อย
 * จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์ค้นหา/กรอง/แบ่งหน้า
 * @returns ผลลัพธ์ useQuery ของ TransactionListResponse (รวม summary)
 * @example
 * const { data } = useTransaction({ page: 1, perpage: 20 });
 */
export function useTransaction(params?: ParamsDto) {
  const buCode = useBuCode();

  return useQuery<TransactionListResponse>({
    queryKey: [QUERY_KEYS.TRANSACTIONS, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(API_ENDPOINTS.TRANSACTIONS(buCode), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}
