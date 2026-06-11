import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_NORMAL } from "@/lib/cache-config";
import type {
  CreatePriceListTemplateDto,
  PriceListTemplate,
} from "@/types/price-list-template";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<PriceListTemplate, CreatePriceListTemplateDto>({
  queryKey: QUERY_KEYS.PRICE_LIST_TEMPLATES,
  endpoint: API_ENDPOINTS.PRICE_LIST_TEMPLATES,
  label: "price list template",
  updateMethod: "PATCH",
  cacheProfile: CACHE_NORMAL,
});

/**
 * Hook ดึงรายการ price list template แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้สำหรับ vendor price request workflow
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<PriceListTemplate>
 * @example
 * ```ts
 * const { data } = usePriceListTemplate({ page: 1, perpage: 20 });
 * ```
 */
export const usePriceListTemplate = crud.useList;

/**
 * Hook ดึง price list template ตาม id
 *
 * @param id - id ของ template
 * @returns UseQueryResult ของ PriceListTemplate
 * @example
 * ```ts
 * const { data } = usePriceListTemplateById(params.id);
 * ```
 */
export const usePriceListTemplateById = crud.useById;

/**
 * Hook สำหรับสร้าง price list template ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreatePriceListTemplate().mutate({ code: "TPL01", name: "Monthly" });
 * ```
 */
export const useCreatePriceListTemplate = crud.useCreate;

/**
 * Hook สำหรับแก้ไข price list template
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdatePriceListTemplate().mutate({ id, code: "TPL02" });
 * ```
 */
export const useUpdatePriceListTemplate = crud.useUpdate;

/**
 * Hook สำหรับลบ price list template
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeletePriceListTemplate().mutate(tpl.id);
 * ```
 */
export const useDeletePriceListTemplate = crud.useDelete;

// --- Export ---

interface ExportPriceListTemplateArgs {
  params?: ParamsDto;
  columns: XlsxColumn<PriceListTemplate>[];
}

/**
 * Hook ส่งออก Price List Template เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบัน
 * และ endpoint เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportPriceListTemplate, isExporting }
 */
export function useExportPriceListTemplate() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportPriceListTemplate = async ({ params, columns }: ExportPriceListTemplateArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<PriceListTemplate>({
      fetch: async () => {
        const url = buildUrl(
          API_ENDPOINTS.PRICE_LIST_TEMPLATES(buCode),
          params,
        );
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch price list templates");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Price List Templates",
      fileNamePrefix: "price-list-template",
    });
  };

  return { exportPriceListTemplate, isExporting };
}
