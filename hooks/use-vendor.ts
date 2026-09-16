import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
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

export const useVendor = crud.useList;

export const useVendorById = crud.useById;

export const useCreateVendor = crud.useCreate;

export const useUpdateVendor = crud.useUpdate;

export const useDeleteVendor = crud.useDelete;

// --- Export ---

interface ExportVendorArgs {
  params?: ParamsDto;
  columns: XlsxColumn<Vendor>[];
}

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
