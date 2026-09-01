import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { buildUrl } from "@/lib/build-query-string";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import type { PaginatedResponse, ParamsDto } from "@/types/params";
import type { JournalVoucher, JournalVoucherAction, JournalVoucherInput } from "@/types/journal-voucher";

const key = "journal-vouchers";

async function readJson<T>(response: Response, message: string): Promise<T> {
  if (!response.ok) throw await ApiError.from(response, message);
  return response.json() as Promise<T>;
}

export function useJournalVouchers(params?: ParamsDto) {
  const buCode = useBuCode();
  return useQuery<PaginatedResponse<JournalVoucher>>({
    queryKey: [key, buCode, params],
    queryFn: async () => readJson(await httpClient.get(buildUrl(API_ENDPOINTS.JOURNAL_VOUCHERS(buCode!), params)), "Failed to load Journal Vouchers"),
    enabled: !!buCode,
  });
}

export function useJournalVoucherSettings() {
  const buCode = useBuCode();
  return useQuery<{ workflow_enabled: boolean; journal_staging_mode: "standard" | "strict" }>({
    queryKey: [key, buCode, "settings"],
    queryFn: async () => {
      const json = await readJson<{ data: { workflow_enabled: boolean; journal_staging_mode: "standard" | "strict" } }>(await httpClient.get(API_ENDPOINTS.JOURNAL_VOUCHER_SETTINGS(buCode!)), "Failed to load Journal Voucher settings");
      return json.data;
    },
    enabled: !!buCode,
  });
}

export function useJournalVoucher(id?: string) {
  const buCode = useBuCode();
  return useQuery<JournalVoucher>({
    queryKey: [key, buCode, id],
    queryFn: async () => {
      const json = await readJson<{ data: JournalVoucher }>(await httpClient.get(`${API_ENDPOINTS.JOURNAL_VOUCHERS(buCode!)}/${id}`), "Failed to load Journal Voucher");
      return json.data;
    },
    enabled: !!buCode && !!id && id !== "new",
  });
}

export function useCreateJournalVoucher() {
  return useApiMutation<JournalVoucherInput, { data: JournalVoucher }>({
    mutationFn: (data, buCode) => httpClient.post(API_ENDPOINTS.JOURNAL_VOUCHERS(buCode), data),
    invalidateKeys: [key],
    errorMessage: "Failed to create Journal Voucher",
  });
}

export function useUpdateJournalVoucher() {
  return useApiMutation<JournalVoucherInput & { id: string; doc_version: number }, { data: JournalVoucher }>({
    mutationFn: ({ id, ...data }, buCode) => httpClient.put(`${API_ENDPOINTS.JOURNAL_VOUCHERS(buCode)}/${id}`, data),
    invalidateKeys: [key],
    errorMessage: "Failed to update Journal Voucher",
  });
}

export function useJournalVoucherAction(action: "submit" | "approve" | "reject" | "return-to-draft" | "retry-post" | "reschedule" | "reverse" | "void") {
  return useApiMutation<JournalVoucherAction & { id: string }, { data: JournalVoucher }>({
    mutationFn: ({ id, ...data }, buCode) => httpClient.post(`${API_ENDPOINTS.JOURNAL_VOUCHERS(buCode)}/${id}/${action}`, data),
    invalidateKeys: [key],
    errorMessage: `Failed to ${action} Journal Voucher`,
  });
}

export function useCopyJournalVoucher() {
  return useApiMutation<string, { data: JournalVoucher }>({
    mutationFn: (id, buCode) => httpClient.post(`${API_ENDPOINTS.JOURNAL_VOUCHERS(buCode)}/${id}/copy`),
    invalidateKeys: [key],
    errorMessage: "Failed to copy Journal Voucher",
  });
}
