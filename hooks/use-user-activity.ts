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
 * Hook ดึงประวัติกิจกรรม (activity log) ของผู้ใช้ใน BU ปัจจุบัน
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เพราะข้อมูลกิจกรรมอัปเดตบ่อย
 * จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์ค้นหา/กรอง/แบ่งหน้า
 * @param options - ตัวเลือก UseQueryOptions เพิ่มเติม
 * @returns ผลลัพธ์ useQuery ของ PaginatedResponse<ActivityLog>
 * @example
 * const { data } = useUserActivity({ page: 1, search: "login" });
 */
export function useUserActivity(
  params?: ParamsDto,
  options?: Omit<
    UseQueryOptions<PaginatedResponse<ActivityLog>>,
    "queryKey" | "queryFn"
  >,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<ActivityLog>>({
    queryKey: [QUERY_KEYS.USER_ACTIVITY, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(API_ENDPOINTS.ACTIVITY_LOGS(buCode), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch user activity");
      return res.json();
    },
    ...CACHE_DYNAMIC,
    ...options,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

// --- Export ---

interface ExportUserActivityArgs {
  params?: ParamsDto;
  columns: XlsxColumn<ActivityLog>[];
}

/**
 * Hook ส่งออก User Activity เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบัน
 * และ endpoint เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportUserActivity, isExporting }
 */
export function useExportUserActivity() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportUserActivity = async ({
    params,
    columns,
  }: ExportUserActivityArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<ActivityLog>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.ACTIVITY_LOGS(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch user activity");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "User Activity",
      fileNamePrefix: "user-activity",
    });
  };

  return { exportUserActivity, isExporting };
}
