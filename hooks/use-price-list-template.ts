import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
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

export const usePriceListTemplate = crud.useList;

export const usePriceListTemplateById = crud.useById;

export const useCreatePriceListTemplate = crud.useCreate;

export const useUpdatePriceListTemplate = crud.useUpdate;

export const useDeletePriceListTemplate = crud.useDelete;

// --- Export ---

interface ExportPriceListTemplateArgs {
  params?: ParamsDto;
  columns: XlsxColumn<PriceListTemplate>[];
}

export function useExportPriceListTemplate() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportPriceListTemplate = async ({
    params,
    columns,
  }: ExportPriceListTemplateArgs) => {
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
