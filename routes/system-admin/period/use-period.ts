import { createConfigCrud } from "@/hooks/use-config-crud";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  Period,
  CreatePeriodDto,
  GenerateNextPeriodDto,
} from "@/types/period";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<Period, CreatePeriodDto>({
  queryKey: QUERY_KEYS.PERIODS,
  endpoint: API_ENDPOINTS.PERIODS,
  label: "period",
  updateMethod: "PATCH",
});

export const usePeriod = crud.useList;

export const usePeriodById = crud.useById;

export const useCreatePeriod = crud.useCreate;

export const useUpdatePeriod = crud.useUpdate;

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
