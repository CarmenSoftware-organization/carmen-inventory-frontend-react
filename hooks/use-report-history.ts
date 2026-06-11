import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { buildQueryString } from "@/utils/build-query-string";
import type { ReportHistory } from "@/types/report-history";
import type { PaginatedResponse, ParamsDto } from "@/types/params";

/**
 * Hook ดึงประวัติ job report (queued/processing/completed/failed/cancelled)
 *
 * Backend คืน standard shape: `{ data: ReportHistory[], paginate: {...} }`
 * ใช้ pattern `data?.data` / `data?.paginate.total` เหมือน list page อื่น
 */
export function useReportHistory(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();
  return useQuery<PaginatedResponse<ReportHistory>>({
    queryKey: [QUERY_KEYS.REPORT_HISTORY, buCode, params],
    queryFn: async () => {
      const qs = buildQueryString({
        page: params?.page,
        perpage: params?.perpage,
        search: params?.search,
        filter: params?.filter,
        sort: params?.sort,
      });
      const url = qs
        ? `${API_ENDPOINTS.REPORT_HISTORY(buCode!)}?${qs}`
        : API_ENDPOINTS.REPORT_HISTORY(buCode!);
      const res = await httpClient.get(url);
      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to fetch report history");
      }
      return res.json();
    },
    enabled: !!buCode && (options?.enabled ?? true),
    ...CACHE_DYNAMIC,
  });
}
