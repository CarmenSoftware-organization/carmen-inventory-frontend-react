import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useProfile } from "@/hooks/use-profile";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { ApiError } from "@/lib/api-error";
import type { RunningCode, CreateRunningCodeDto } from "@/types/running-code";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<RunningCode, CreateRunningCodeDto>({
  queryKey: QUERY_KEYS.RUNNING_CODES,
  endpoint: API_ENDPOINTS.RUNNING_CODES,
  label: "running code",
});

export const useRunningCode = crud.useList;

export const useRunningCodeById = crud.useById;

export const useCreateRunningCode = crud.useCreate;

export const useUpdateRunningCode = crud.useUpdate;

export const useDeleteRunningCode = crud.useDelete;

export function useInitRunningCode() {
  const { buCode } = useProfile();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, void>({
    mutationFn: async () => {
      const url = API_ENDPOINTS.RUNNING_CODES_INIT(buCode!);
      const res = await httpClient.post(url);
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to init running code");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.RUNNING_CODES],
      });
    },
  });
}

// --- Export ---

interface ExportRunningCodeArgs {
  params?: ParamsDto;
  columns: XlsxColumn<RunningCode>[];
}

export function useExportRunningCode() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportRunningCode = async ({
    params,
    columns,
  }: ExportRunningCodeArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<RunningCode>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.RUNNING_CODES(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch running codes");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Running Codes",
      fileNamePrefix: "running-code",
    });
  };

  return { exportRunningCode, isExporting };
}
