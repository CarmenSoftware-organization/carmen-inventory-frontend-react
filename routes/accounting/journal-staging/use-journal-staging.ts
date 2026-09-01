import { useQuery } from "@tanstack/react-query";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useBuCode } from "@/hooks/use-bu-code";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { buildUrl } from "@/lib/build-query-string";
import { httpClient } from "@/lib/http-client";
import type { PaginatedResponse, ParamsDto } from "@/types/params";

export interface JournalStagingBatch { id: string; batch_no: string; source_channel: string; status: string; total_records: number; total_jvs: number; total_lines: number; }
export function useJournalStagingBatches(params?: ParamsDto) {
  const buCode = useBuCode();
  return useQuery<PaginatedResponse<JournalStagingBatch>>({ queryKey: ["journal-staging-batches", buCode, params], queryFn: async () => (await httpClient.get(buildUrl(API_ENDPOINTS.JOURNAL_STAGING_BATCHES(buCode!), params))).json(), enabled: !!buCode });
}

export function useProcessJournalStagingBatch() {
  return useApiMutation<string, unknown>({ mutationFn: (id, buCode) => httpClient.post(`${API_ENDPOINTS.JOURNAL_STAGING_BATCHES(buCode)}/${id}/process`), invalidateKeys: ["journal-staging-batches"], errorMessage: "Failed to process staging batch" });
}
