import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { WorkflowCreateModel } from "./wf-form-schema";

export function useCreateWorkflow() {
  return useApiMutation<WorkflowCreateModel>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.WORKFLOWS(buCode), data),
    invalidateKeys: [QUERY_KEYS.WORKFLOWS],
    errorMessage: "Failed to create workflow",
  });
}

export function useUpdateWorkflow() {
  return useApiMutation<
    WorkflowCreateModel & { id: string; doc_version?: number }
  >({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.put(`${API_ENDPOINTS.WORKFLOWS(buCode)}/${id}`, data),
    invalidateKeys: [QUERY_KEYS.WORKFLOWS],
    errorMessage: "Failed to update workflow",
  });
}

export function useDeleteWorkflow() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.WORKFLOWS(buCode)}/${id}`),
    invalidateKeys: [QUERY_KEYS.WORKFLOWS],
    errorMessage: "Failed to delete workflow",
  });
}
