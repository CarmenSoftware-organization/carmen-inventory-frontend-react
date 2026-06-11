import { useQuery } from "@tanstack/react-query";
import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC, CACHE_NORMAL } from "@/lib/cache-config";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  CreatePriceListDto,
  PriceList,
  PriceListActiveVendor,
} from "@/types/price-list";
import type { PaginatedResponse } from "@/types/params";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<PriceList, CreatePriceListDto>({
  queryKey: QUERY_KEYS.PRICE_LISTS,
  endpoint: API_ENDPOINTS.PRICE_LISTS,
  label: "price list",
  updateMethod: "PATCH",
  cacheProfile: CACHE_NORMAL,
});

/**
 * Hook ดึงรายการ price list แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน vendor-management > price list
 * และ `LookupPriceList` ใน PR/PO
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<PriceList>
 * @example
 * ```ts
 * const { data } = usePriceList({ page: 1, perpage: 20 });
 * ```
 */
export const usePriceList = crud.useList;

/**
 * Hook ดึง price list ตาม id
 *
 * @param id - id ของ price list
 * @returns UseQueryResult ของ PriceList
 * @example
 * ```ts
 * const { data } = usePriceListById(params.id);
 * ```
 */
export const usePriceListById = crud.useById;

/**
 * Hook สำหรับสร้าง price list ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreatePriceList().mutate({ code: "PL01", vendor_id: "..." });
 * ```
 */
export const useCreatePriceList = crud.useCreate;

/**
 * Hook สำหรับแก้ไข price list
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdatePriceList().mutate({ id, code: "PL02" });
 * ```
 */
export const useUpdatePriceList = crud.useUpdate;

/**
 * Hook สำหรับลบ price list
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeletePriceList().mutate(pl.id);
 * ```
 */
export const useDeletePriceList = crud.useDelete;

// --- Export ---

interface ExportPriceListArgs {
  params?: ParamsDto;
  columns: XlsxColumn<PriceList>[];
}

/**
 * Hook ส่งออก Price List เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportPriceList, isExporting }
 */
export function useExportPriceList() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportPriceList = async ({ params, columns }: ExportPriceListArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<PriceList>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.PRICE_LISTS(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch price lists");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Price Lists",
      fileNamePrefix: "price-list",
    });
  };

  return { exportPriceList, isExporting };
}

/**
 * Hook ดึง vendor ที่มี price list active ในวันที่ระบุ ผ่าน
 * `GET /{buCode}/pricelists/active-vendors/{date}`
 *
 * Date คาดว่าอยู่ในรูป `yyyy-MM-dd` — caller responsible แปลงจาก ISO ก่อนส่งเข้า
 * Query disable เมื่อ `date` ว่างหรือ buCode ยังไม่พร้อม
 *
 * @param date - วันที่ในรูป `yyyy-MM-dd` (ถ้าว่างจะปิด query)
 * @returns UseQueryResult ของ `PriceListActiveVendor[]`
 * @example
 * const { data: vendors = [] } = usePriceListActiveVendors("2026-06-01");
 */
/**
 * Hook ดึง price list ที่ active ของ vendor หนึ่งราย ในวันที่ระบุ ผ่าน
 * `GET /{buCode}/pricelists/active/{vendorId}/{date}`
 *
 * Response อาจคืน `data: PriceList[]` ตรงๆ หรือ `PaginatedResponse<PriceList>`
 * ตามสไตล์ของ BE — hook handle ทั้งสองรูปแบบ
 *
 * @param vendorId - vendor id (ถ้าว่างจะปิด query)
 * @param date - วันที่ในรูป `yyyy-MM-dd` (ถ้าว่างจะปิด query)
 * @returns UseQueryResult ของ `PriceList[]`
 * @example
 * const { data: priceLists = [] } = useActivePriceListsByVendor(vendorId, "2026-06-01");
 */
export function useActivePriceListsByVendor(
  vendorId: string | null | undefined,
  date: string | undefined,
) {
  const buCode = useBuCode();
  return useQuery<PriceList[], ApiError>({
    queryKey: [QUERY_KEYS.PRICE_LIST_ACTIVE_BY_VENDOR, buCode, vendorId, date],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRICE_LIST_ACTIVE_BY_VENDOR(buCode!, vendorId!, date!),
      );
      if (!res.ok) {
        throw ApiError.fromResponse(
          res,
          "Failed to load active price lists for vendor",
        );
      }
      const json = (await res.json()) as
        | PaginatedResponse<PriceList>
        | { data?: PriceList[] };
      return json.data ?? [];
    },
    enabled: !!buCode && !!vendorId && !!date,
    ...CACHE_DYNAMIC,
  });
}

export function usePriceListActiveVendors(date: string | undefined) {
  const buCode = useBuCode();
  return useQuery<PriceListActiveVendor[], ApiError>({
    queryKey: [QUERY_KEYS.PRICE_LIST_ACTIVE_VENDORS, buCode, date],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRICE_LIST_ACTIVE_VENDORS(buCode!, date!),
      );
      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to load active vendors");
      }
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!date,
    ...CACHE_DYNAMIC,
  });
}
