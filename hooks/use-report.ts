import { useMutation, useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC, CACHE_STATIC } from "@/lib/cache-config";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import { buildQueryString, buildUrl } from "@/utils/build-query-string";
import type {
  ReportListLookupItem,
  ReportListLookupMap,
  ReportPeriodInfo,
  ReportPeriodMap,
  ReportTemplate,
  RunReportPayload,
  RunReportResponse,
} from "@/types/report";
import type { PaginatedResponse, ParamsDto } from "@/types/params";

/**
 * Hook ดึงรายการ report templates จาก endpoint `/reports/templates`
 * (แยกจาก `useReport` ซึ่งเป็น CRUD ของ report master)
 *
 * @param params - page/perpage/search/filter/sort → ส่งเป็น query string
 * @returns UseQueryResult ของ `PaginatedResponse<ReportTemplate>`
 * @example
 * const { data } = useReportTemplates({ page: 1, perpage: 10 });
 * const items = data?.data ?? [];
 * const total = data?.paginate?.total ?? 0;
 */
export function useReportTemplates(params?: ParamsDto) {
  const buCode = useBuCode();
  return useQuery<PaginatedResponse<ReportTemplate>, ApiError>({
    queryKey: [QUERY_KEYS.REPORTS, "templates", buCode, params],
    queryFn: async () => {
      const qs = buildQueryString({
        page: params?.page,
        perpage: params?.perpage,
        search: params?.search,
        filter: params?.filter,
        sort: params?.sort,
      });
      const base = `${API_ENDPOINTS.REPORTS(buCode!)}/templates`;
      const url = qs ? `${base}?${qs}` : base;
      const res = await httpClient.get(url);
      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to fetch report templates");
      }
      return res.json();
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

interface ReportListLookupsOptions {
  /** XML DataSource names — สงวน case เดิมไว้สำหรับ key ของ result */
  readonly sources: readonly string[];
  /** ต้องการดึง period info เพิ่ม (สำหรับ keyword `@current_period` / `@previous_period`) */
  readonly includePeriods?: boolean;
}

interface ReportListLookupsResult {
  data: ReportListLookupMap;
  periods: ReportPeriodMap;
}

/**
 * Hook ดึง lookup data + period ของ report list page (XML-driven dialog)
 *
 * - Query lowercase ของ source name ส่งไป BE แล้ว map กลับเป็น key ดั้งเดิม
 * - แต่ละ item แปลงเป็น `{ code, name }` โดย name = "code - name" ถ้ามีทั้งคู่
 * - ถ้า `includePeriods=true` จะดึง `current-period` + `previous-period` มาด้วย
 * - Cache STATIC (lookup data ไม่ค่อยเปลี่ยน)
 *
 * @param options - sources + includePeriods flag
 * @returns `{ data, periods }`
 * @example
 * const { data: lookups, periods } = useReportListLookups({
 *   sources: ["product", "location"],
 *   includePeriods: true,
 * });
 */
export function useReportListLookups({
  sources,
  includePeriods = false,
}: ReportListLookupsOptions) {
  const buCode = useBuCode();
  const lowerSources = [...new Set(sources.map((s) => s.toLowerCase()))].sort();
  const allTypes = [...lowerSources];
  if (includePeriods) allTypes.push("current-period", "previous-period");
  const typesKey = allTypes.join(",");

  return useQuery<ReportListLookupsResult, ApiError>({
    queryKey: [QUERY_KEYS.REPORT_LOOKUPS, buCode, typesKey, "list"],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.REPORT_LOOKUPS(buCode!), {
        types: typesKey,
      });
      const res = await httpClient.get(url);
      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to fetch report lookups");
      }
      const json = await res.json();
      const raw = (json.data ?? json) as Record<string, unknown>;

      const data: ReportListLookupMap = {};
      for (const original of sources) {
        const items = raw[original.toLowerCase()];
        if (!Array.isArray(items)) continue;
        data[original] = (items as Array<Record<string, unknown>>).map(
          (item): ReportListLookupItem => {
            const code = String(item.code ?? "");
            const rawName = String(item.name ?? "");
            return {
              code,
              // Period (and any source where code === name) submits the value as
              // both code and name — show it once, not "2026-01 - 2026-01".
              name:
                code && rawName && code !== rawName
                  ? `${code} - ${rawName}`
                  : rawName,
            };
          },
        );
      }

      const periods: ReportPeriodMap = includePeriods
        ? {
            "current-period": raw["current-period"] as
              | ReportPeriodInfo
              | undefined,
            "previous-period": raw["previous-period"] as
              | ReportPeriodInfo
              | undefined,
          }
        : {};

      return { data, periods };
    },
    enabled: !!buCode && allTypes.length > 0,
    ...CACHE_STATIC,
  });
}

/**
 * Mutation สำหรับ generate report viewer URL ผ่าน POST `/reports/viewer`
 *
 * @returns UseMutationResult — ส่ง `{ template_id, filters }` คืน `{ url }`
 * @example
 * const run = useRunReportMutation();
 * const { url } = await run.mutateAsync({ template_id, filters });
 */
export function useRunReportMutation() {
  const buCode = useBuCode();
  return useMutation<RunReportResponse, ApiError, RunReportPayload>({
    mutationFn: async (payload) => {
      const url = `${API_ENDPOINTS.REPORTS(buCode!)}/viewer`;
      const res = await httpClient.post(url, payload);
      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to generate report viewer");
      }
      const json = await res.json();
      const viewerUrl: string | undefined = json.data?.url ?? json.url;
      if (!viewerUrl) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Empty viewer URL from backend",
          res.status,
        );
      }
      return { url: viewerUrl };
    },
  });
}
