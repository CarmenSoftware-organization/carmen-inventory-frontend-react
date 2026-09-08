import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { WorkflowCreateModel } from "./wf-form-schema";

/**
 * Hook สร้าง workflow ใหม่ผ่าน POST
 * Invalidate WORKFLOWS cache เมื่อสำเร็จ
 * @returns mutation สำหรับสร้าง workflow
 * @example
 * const create = useCreateWorkflow();
 * create.mutate(payload);
 */
export function useCreateWorkflow() {
  return useApiMutation<WorkflowCreateModel>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.WORKFLOWS(buCode), data),
    invalidateKeys: [QUERY_KEYS.WORKFLOWS],
    errorMessage: "Failed to create workflow",
  });
}

/**
 * Hook แก้ไข workflow ผ่าน PUT โดยระบุ id
 * Invalidate WORKFLOWS cache เมื่อสำเร็จ
 * @returns mutation สำหรับอัพเดต workflow
 * @example
 * const update = useUpdateWorkflow();
 * update.mutate({ id, ...values });
 */
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

/**
 * Hook ลบ workflow ตาม id
 * DELETE และ invalidate WORKFLOWS cache
 * @returns mutation สำหรับลบ workflow
 * @example
 * const del = useDeleteWorkflow();
 * del.mutate(id);
 */
export function useDeleteWorkflow() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.WORKFLOWS(buCode)}/${id}`),
    invalidateKeys: [QUERY_KEYS.WORKFLOWS],
    errorMessage: "Failed to delete workflow",
  });
}
