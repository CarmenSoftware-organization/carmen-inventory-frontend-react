import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { buildUrl } from "@/lib/build-query-string";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import type { WastageItem, WastageSummary } from "@/types/wastage-reporting";

export interface WastageReportResponse extends PaginatedResponse<WastageItem> {
  summary?: WastageSummary;
}

/**
 * Hook ดึงรายการ lot สินค้าหมดอายุ/ใกล้หมดอายุ (wastage reporting)
 * ยิง `GET /api/{bu}/wastage-reporting` แบบแบ่งหน้า พร้อม `summary`
 * (จำนวน/มูลค่าที่เสี่ยงเสียรวม) จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์ค้นหา/กรอง/แบ่งหน้า
 * @returns ผลลัพธ์ useQuery ของ WastageReportResponse
 * @example
 * const { data } = useWastageReport({ page: 1, search: "GRN2608" });
 */
export function useWastageReport(params?: ParamsDto) {
  const buCode = useBuCode();

  return useQuery<WastageReportResponse>({
    queryKey: [QUERY_KEYS.WASTAGE_REPORTS, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        buildUrl(API_ENDPOINTS.WASTAGE_REPORTING(buCode), params),
      );
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to fetch wastage reporting");
      }
      return res.json();
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}
