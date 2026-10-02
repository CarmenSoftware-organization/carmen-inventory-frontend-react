import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { CACHE_STATIC } from "@/lib/cache-config";
import type { ReportFormTemplate } from "@/types/report-form-template";

export type ReportFormOption = { value: string; label: string };

/**
 * Hook ดึง report template ชนิด form ทั้งหมด แล้วจัดกลุ่มตาม `report_group`
 *
 * ยิงโดยไม่ส่ง `group` แล้ววนหน้าจนครบ (fetchAllPages) แทนการยิงทีละ
 * document type — หน้า Default Setting ต้องใช้ครบทุกกลุ่มพร้อมกันอยู่แล้ว
 *
 * @returns query ที่คืน `Map<report_group, ReportFormOption[]>`
 */
export function useReportFormTemplates() {
  return useQuery<Map<string, ReportFormOption[]>>({
    queryKey: [QUERY_KEYS.REPORT_TEMPLATE_FORMS],
    queryFn: async () => {
      // `silentForbidden`: endpoint นี้อยู่ใต้ api-system (namespace ของแพลตฟอร์ม) ถ้าสิทธิ์
      // ฝั่ง backend ถูกรัดกลับไปเป็น platform-only อีกครั้ง ผู้ใช้ BU จะได้ 403 — หน้านี้
      // จัดการเองอยู่แล้วด้วยข้อความในส่วน "แบบฟอร์มการพิมพ์" + option ค่าเดิมที่ไม่หายตอน Save
      // การเด้ง modal ทับทั้งหน้าเพราะ dropdown ตัวเดียวจึงเกินกว่าเหตุ
      const rows = await fetchAllPages<ReportFormTemplate>(
        async (page, perpage) => {
          const res = await httpClient.get(
            `${API_ENDPOINTS.REPORT_TEMPLATE_FORMS}?page=${page}&perpage=${perpage}`,
            { silentForbidden: true },
          );
          if (!res.ok) {
            throw await ApiError.from(
              res,
              "Failed to fetch report form templates",
            );
          }
          // envelope = { paginate, data: [...], status, success } — backend PR #248
          // (a2031c4f0) แก้ double-nest แล้วและยิงยืนยันกับ dev stack จริง
          const json = await res.json();
          return {
            data: Array.isArray(json.data) ? json.data : [],
            paginate: json.paginate,
          };
        },
      );

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
