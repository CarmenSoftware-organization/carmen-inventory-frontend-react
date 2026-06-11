import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import type { ActivityLog } from "@/types/activity-log";
import type { PaginatedResponse, ParamsDto } from "@/types/params";

/**
 * Hook ดึงข้อมูล activity log แบบแบ่งหน้าตาม buCode ปัจจุบัน
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เพราะข้อมูลมีการเปลี่ยนแปลงบ่อย
 * จะไม่ fetch จนกว่า buCode จะพร้อม (enabled guard)
 * @param params - พารามิเตอร์สำหรับ pagination/filter/search
 * @param options - ตัวเลือก UseQueryOptions เพิ่มเติม (ไม่รวม queryKey/queryFn)
 * @returns UseQueryResult ของ PaginatedResponse<ActivityLog>
 * @example
 * const { data, isLoading } = useActivityLog({ page: 1, perpage: 20, search: "login" });
 */
export function useActivityLog(
  params?: ParamsDto,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<ActivityLog>>,
    "queryKey" | "queryFn"
  >,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<ActivityLog>>({
    queryKey: [QUERY_KEYS.ACTIVITY_LOGS, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(API_ENDPOINTS.ACTIVITY_LOGS(buCode), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    },
    ...CACHE_DYNAMIC,
    ...options,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

// --- Export ---

interface ExportActivityLogArgs {
  params?: ParamsDto;
  columns: XlsxColumn<ActivityLog>[];
}

/**
 * Hook ส่งออก Activity Log เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบัน
 * และ endpoint เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportActivityLog, isExporting }
 */
export function useExportActivityLog() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportActivityLog = async ({ params, columns }: ExportActivityLogArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<ActivityLog>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.ACTIVITY_LOGS(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch activity logs");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Activity Logs",
      fileNamePrefix: "activity-log",
    });
  };

  return { exportActivityLog, isExporting };
}
