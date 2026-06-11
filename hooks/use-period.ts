import { createConfigCrud } from "@/hooks/use-config-crud";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Period, CreatePeriodDto, GenerateNextPeriodDto } from "@/types/period";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<Period, CreatePeriodDto>({
  queryKey: QUERY_KEYS.PERIODS,
  endpoint: API_ENDPOINTS.PERIODS,
  label: "period",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการ Period (งวดการเงิน) แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน period end module และ reports
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Period>
 * @example
 * ```ts
 * const { data } = usePeriod({ page: 1, perpage: 20 });
 * ```
 */
export const usePeriod = crud.useList;

/**
 * Hook ดึง Period ตาม id
 *
 * @param id - id ของ period
 * @returns UseQueryResult ของ Period
 * @example
 * ```ts
 * const { data } = usePeriodById(params.id);
 * ```
 */
export const usePeriodById = crud.useById;

/**
 * Hook สำหรับสร้าง Period ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreatePeriod().mutate({ code: "2026-01", start_date: "...", end_date: "..." });
 * ```
 */
export const useCreatePeriod = crud.useCreate;

/**
 * Hook สำหรับแก้ไข Period
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdatePeriod().mutate({ id, code: "2026-02" });
 * ```
 */
export const useUpdatePeriod = crud.useUpdate;

/**
 * Hook สำหรับลบ Period
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeletePeriod().mutate(p.id);
 * ```
 */
export const useDeletePeriod = crud.useDelete;

/**
 * Hook สำหรับ generate Period ถัดไปแบบ batch ตามการตั้งค่าที่ระบุ
 *
 * ยิง POST ไป `/config/{bu}/periods/next` พร้อม payload ตั้งค่า
 * เช่นจำนวนงวดที่ต้องการสร้าง + รูปแบบรหัสงวด invalidate list หลังสำเร็จ
 *
 * @returns UseMutationResult รับ `GenerateNextPeriodDto` เป็น variable
 * @example
 * ```ts
 * const gen = useGenerateNextPeriod();
 * gen.mutate({ count: 12, period_type: "monthly" });
 * ```
 */
export function useGenerateNextPeriod() {
  return useApiMutation<GenerateNextPeriodDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PERIOD_NEXT(buCode), data),
    invalidateKeys: [QUERY_KEYS.PERIODS],
    errorMessage: "Failed to generate next periods",
  });
}

// --- Export ---

interface ExportPeriodArgs {
  params?: ParamsDto;
  columns: XlsxColumn<Period>[];
}

/**
 * Hook ส่งออก Period เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportPeriod, isExporting }
 */
export function useExportPeriod() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportPeriod = async ({ params, columns }: ExportPeriodArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<Period>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.PERIODS(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch periods");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Periods",
      fileNamePrefix: "period",
    });
  };

  return { exportPeriod, isExporting };
}
