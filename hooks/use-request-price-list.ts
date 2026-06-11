import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import type {
  RequestPriceList,
  CreateRequestPriceListDto,
} from "@/types/request-price-list";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<RequestPriceList, CreateRequestPriceListDto>({
  queryKey: QUERY_KEYS.REQUEST_PRICE_LISTS,
  endpoint: API_ENDPOINTS.REQUEST_PRICE_LISTS,
  label: "request price list",
  updateMethod: "PATCH",
  cacheProfile: CACHE_DYNAMIC,
});

/**
 * Hook ดึงรายการคำขอ price list (request price list) แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน vendor-management workflow ส่งคำขอใบเสนอราคา
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<RequestPriceList>
 * @example
 * ```ts
 * const { data } = useRequestPriceList({ page: 1, perpage: 20 });
 * ```
 */
export const useRequestPriceList = crud.useList;

/**
 * Hook ดึงคำขอ price list ตาม id
 *
 * @param id - id ของคำขอ
 * @returns UseQueryResult ของ RequestPriceList
 * @example
 * ```ts
 * const { data } = useRequestPriceListById(params.id);
 * ```
 */
export const useRequestPriceListById = crud.useById;

/**
 * Hook สำหรับสร้างคำขอ price list ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateRequestPriceList().mutate({ vendor_id: "...", template_id: "..." });
 * ```
 */
export const useCreateRequestPriceList = crud.useCreate;

/**
 * Hook สำหรับแก้ไขคำขอ price list
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateRequestPriceList().mutate({ id, vendor_id: "..." });
 * ```
 */
export const useUpdateRequestPriceList = crud.useUpdate;

/**
 * Hook สำหรับลบคำขอ price list
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteRequestPriceList().mutate(req.id);
 * ```
 */
export const useDeleteRequestPriceList = crud.useDelete;

// --- Export ---

interface ExportRequestPriceListArgs {
  params?: ParamsDto;
  columns: XlsxColumn<RequestPriceList>[];
}

/**
 * Hook ส่งออก RFP เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportRequestPriceList, isExporting }
 */
export function useExportRequestPriceList() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportRequestPriceList = async ({
    params,
    columns,
  }: ExportRequestPriceListArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<RequestPriceList>({
      fetch: async () => {
        const url = buildUrl(
          API_ENDPOINTS.REQUEST_PRICE_LISTS(buCode),
          params,
        );
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch request price lists");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Request Price Lists",
      fileNamePrefix: "request-price-list",
    });
  };

  return { exportRequestPriceList, isExporting };
}
