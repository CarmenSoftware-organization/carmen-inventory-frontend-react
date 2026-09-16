import { createConfigCrud } from "@/hooks/use-config-crud";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  InventoryPeriod,
  CreateInventoryPeriodDto,
  GenerateNextInventoryPeriodDto,
} from "@/types/inventory-period";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<InventoryPeriod, CreateInventoryPeriodDto>({
  queryKey: QUERY_KEYS.PERIODS,
  endpoint: API_ENDPOINTS.PERIODS,
  label: "inventory period",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการ InventoryPeriod (รอบสินค้าคงคลัง) แบบแบ่งหน้า
 *
 * Re-export จาก factory
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<InventoryPeriod>
 * @example
 * ```ts
 * const { data } = useInventoryPeriod({ page: 1, perpage: 20 });
 * ```
 */
export const useInventoryPeriod = crud.useList;

/**
 * Hook ดึง InventoryPeriod ตาม id
 *
 * @param id - id ของ period
 * @returns UseQueryResult ของ InventoryPeriod
 * @example
 * ```ts
 * const { data } = useInventoryPeriodById(params.id);
 * ```
 */
export const useInventoryPeriodById = crud.useById;

/**
 * Hook สำหรับสร้าง InventoryPeriod ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateInventoryPeriod().mutate({ code: "2026-01", start_date: "...", end_date: "..." });
 * ```
 */
export const useCreateInventoryPeriod = crud.useCreate;

/**
 * Hook สำหรับแก้ไข InventoryPeriod
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateInventoryPeriod().mutate({ id, code: "2026-02" });
 * ```
 */
export const useUpdateInventoryPeriod = crud.useUpdate;

/**
 * Hook สำหรับลบ InventoryPeriod
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteInventoryPeriod().mutate(p.id);
 * ```
 */
export const useDeleteInventoryPeriod = crud.useDelete;

/**
 * Hook สำหรับ generate InventoryPeriod ถัดไปแบบ batch ตามการตั้งค่าที่ระบุ
 *
 * ยิง POST ไป `/config/{bu}/periods/next` พร้อม payload ตั้งค่า
 * เช่นจำนวนรอบที่ต้องการสร้าง + รูปแบบรหัสรอบ invalidate list หลังสำเร็จ
 *
 * @returns UseMutationResult รับ `GenerateNextInventoryPeriodDto` เป็น variable
 * @example
 * ```ts
 * const gen = useGenerateNextInventoryPeriod();
 * gen.mutate({ count: 12, period_type: "monthly" });
 * ```
 */
export function useGenerateNextInventoryPeriod() {
  return useApiMutation<GenerateNextInventoryPeriodDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PERIOD_NEXT(buCode), data),
    invalidateKeys: [QUERY_KEYS.PERIODS],
    errorMessage: "Failed to generate next inventory periods",
  });
}

// --- Export ---

interface ExportInventoryPeriodArgs {
  params?: ParamsDto;
  columns: XlsxColumn<InventoryPeriod>[];
}

/**
 * Hook ส่งออก InventoryPeriod เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportInventoryPeriod, isExporting }
 */
export function useExportInventoryPeriod() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportInventoryPeriod = async ({ params, columns }: ExportInventoryPeriodArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<InventoryPeriod>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.PERIODS(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch inventory periods");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Inventory Periods",
      fileNamePrefix: "inventory-period",
    });
  };

  return { exportInventoryPeriod, isExporting };
}
