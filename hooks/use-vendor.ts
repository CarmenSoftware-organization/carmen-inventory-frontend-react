import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_NORMAL } from "@/lib/cache-config";
import type { Vendor, VendorDetail, CreateVendorDto } from "@/types/vendor";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<VendorDetail, CreateVendorDto>({
  queryKey: QUERY_KEYS.VENDORS,
  endpoint: API_ENDPOINTS.VENDORS,
  label: "vendor",
  cacheProfile: CACHE_NORMAL,
});

/**
 * Hook ดึงรายการผู้ขาย (vendor) แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน `LookupVendor`, vendor-management และหน้า PR/PO
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<VendorDetail>
 * @example
 * ```ts
 * const { data } = useVendor({ search: "abc", perpage: 20 });
 * ```
 */
export const useVendor = crud.useList;

/**
 * Hook ดึงข้อมูลผู้ขายตามรหัส
 *
 * @param id - id ของ vendor
 * @returns UseQueryResult ของ VendorDetail
 * @example
 * ```ts
 * const { data } = useVendorById(params.id);
 * ```
 */
export const useVendorById = crud.useById;

/**
 * Hook สำหรับสร้างผู้ขายใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateVendor().mutate({ code: "V001", name: "ABC Co." });
 * ```
 */
export const useCreateVendor = crud.useCreate;

/**
 * Hook สำหรับแก้ไขข้อมูลผู้ขาย
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateVendor().mutate({ id, code: "V001", name: "ABC Ltd." });
 * ```
 */
export const useUpdateVendor = crud.useUpdate;

/**
 * Hook สำหรับลบผู้ขาย
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteVendor().mutate(vendor.id);
 * ```
 */
export const useDeleteVendor = crud.useDelete;

// --- Export ---

interface ExportVendorArgs {
  params?: ParamsDto;
  columns: XlsxColumn<Vendor>[];
}

/**
 * Hook ส่งออก Vendor เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportVendor, isExporting }
 */
export function useExportVendor() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportVendor = async ({ params, columns }: ExportVendorArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<Vendor>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.VENDORS(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch vendors");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Vendors",
      fileNamePrefix: "vendor",
    });
  };

  return { exportVendor, isExporting };
}
