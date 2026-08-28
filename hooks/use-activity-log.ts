import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import type { ActivityLog, ActivityLogDetail } from "@/types/activity-log";
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

/**
 * Hook ดึงประวัติกิจกรรมของเอกสารเดียว (ทุก action ที่เคยทำกับ record นั้น)
 * ไม่ส่ง entity_type ไปด้วยเพราะ entity_id เป็น UUID ที่ไม่ซ้ำข้ามตารางอยู่แล้ว
 * และ backend เรียงจากเก่าไปใหม่ให้ — caller ที่อยากได้ล่าสุดก่อนต้อง reverse เอง
 *
 * ยิงใหม่ทุกครั้งที่ caller เปิดดู (staleTime 0) — ดูเหตุผลที่ตัว option
 * @param entityId - รหัสเอกสาร (ส่ง undefined เพื่อยังไม่ fetch เช่นตอน sheet ปิดอยู่)
 * @param params - พารามิเตอร์ pagination (ค่าเริ่มต้นของ backend คือ 20 รายการ)
 * @returns UseQueryResult ของ PaginatedResponse<ActivityLog>
 * @example
 * const { data } = useActivityLogByRecord(open ? prId : undefined, { perpage: 50 });
 */
export function useActivityLogByRecord(
  entityId: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<ActivityLog>>({
    queryKey: [QUERY_KEYS.ACTIVITY_LOGS_BY_RECORD, buCode, entityId, params],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.ACTIVITY_LOGS_BY_RECORD(buCode!, entityId!),
        params,
      );
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch activity logs");
      return res.json();
    },
    ...CACHE_DYNAMIC,
    // ผู้ใช้กดเปิด sheet เพื่อ "ดูว่าเพิ่งเกิดอะไรขึ้น" — ถ้าใช้ staleTime 1 นาที
    // ตาม CACHE_DYNAMIC การกดเปิดซ้ำภายในนาทีเดียวจะได้ list เดิมจาก cache ทั้งที่
    // เพิ่ง save/approve ไปสด ๆ ในหน้าเดียวกัน. staleTime 0 = ทุกครั้งที่ entityId
    // กลับมาจาก undefined (sheet เปิด) จะยิงใหม่เสมอ และเพราะ gcTime ยัง 5 นาที
    // ผู้ใช้ยังเห็น list เดิมทันทีระหว่างรอของใหม่ ไม่ต้องกลับไปเจอ skeleton
    // (refetchOnWindowFocus ปิดไว้ทั้งแอปแล้ว จึงไม่กลายเป็นยิงรัวตอน focus)
    staleTime: 0,
    enabled: !!buCode && !!entityId,
  });
}

/**
 * Hook ดึง log รายการเดียวพร้อม `changes` ที่ backend diff ให้แล้ว
 * โหลดแบบ lazy (ส่ง id ต่อเมื่อผู้ใช้กางรายการนั้น) เพราะ snapshot ของเอกสารใหญ่
 * @param id - รหัส activity log (undefined = ยังไม่ fetch)
 * @returns UseQueryResult ของ ActivityLogDetail
 * @example
 * const { data } = useActivityLogDetail(expandedId);
 */
export function useActivityLogDetail(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<ActivityLogDetail>({
    queryKey: [QUERY_KEYS.ACTIVITY_LOG_DETAIL, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.ACTIVITY_LOG_DETAIL(buCode!, id!),
      );
      if (!res.ok) throw new Error("Failed to fetch activity log detail");
      const json = await res.json();
      return json.data as ActivityLogDetail;
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && !!id,
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

  const exportActivityLog = async ({
    params,
    columns,
  }: ExportActivityLogArgs) => {
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
