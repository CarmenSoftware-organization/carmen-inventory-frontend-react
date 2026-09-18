import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
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

export const useRequestPriceList = crud.useList;

export const useRequestPriceListById = crud.useById;

export const useCreateRequestPriceList = crud.useCreate;

export const useUpdateRequestPriceList = crud.useUpdate;

export const useDeleteRequestPriceList = crud.useDelete;

// --- Export ---

interface ExportRequestPriceListArgs {
  params?: ParamsDto;
  columns: XlsxColumn<RequestPriceList>[];
}

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
        const url = buildUrl(API_ENDPOINTS.REQUEST_PRICE_LISTS(buCode), params);
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
