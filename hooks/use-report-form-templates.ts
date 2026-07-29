import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import type { ReportFormTemplate } from "@/types/report-form-template";

/** option ของ dropdown เลือกแบบฟอร์ม — value = template id, label = ชื่อ template */
export type ReportFormOption = { value: string; label: string };

/**
 * Hook ดึง report template ชนิด form ทั้งหมด แล้วจัดกลุ่มตาม `report_group`
 *
 * ยิงครั้งเดียวโดยไม่ส่ง `group` (perpage=-1 = ไม่จำกัดจำนวน) แทนการยิงทีละ
 * document type — หน้า Default Setting ต้องใช้ครบทุกกลุ่มพร้อมกันอยู่แล้ว
 *
 * @returns query ที่คืน `Map<report_group, ReportFormOption[]>`
 */
export function useReportFormTemplates() {
  return useQuery<Map<string, ReportFormOption[]>>({
    queryKey: [QUERY_KEYS.REPORT_TEMPLATE_FORMS],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.REPORT_TEMPLATE_FORMS}?perpage=-1`,
      );
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to fetch report form templates");
      }
      const json = await res.json();
      // envelope = { paginate, data: [...], status, success } — backend PR #248
      // (a2031c4f0) แก้ double-nest แล้วและยิงยืนยันกับ dev stack จริง
      const rows: ReportFormTemplate[] = Array.isArray(json.data)
        ? json.data
        : [];

      const map = new Map<string, ReportFormOption[]>();
      for (const row of rows) {
        const group = (row.report_group ?? "").toUpperCase();
        if (!group || !row.id) continue;
        const list = map.get(group) ?? [];
        list.push({ value: row.id, label: row.name || row.id });
        map.set(group, list);
      }
      return map;
    },
    ...CACHE_STATIC,
  });
}
