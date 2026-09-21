import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation, removeFromListById } from "@/hooks/use-api-mutation";
import { createCommentCrud } from "@/hooks/use-comment-crud";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { buildUrl } from "@/lib/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type {
  CreditNote,
  CreditNoteDetail,
  CreateCnDto,
  CnStockMovement,
} from "@/types/credit-note";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/**
 * Hook ดึงรายการ credit note แบบแบ่งหน้าตาม buCode ปัจจุบัน
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เพราะเอกสารเปลี่ยนแปลงบ่อย
 * @param params - พารามิเตอร์ pagination/filter/search
 * @param options - ตัวเลือก enabled เพื่อควบคุมการ fetch
 * @returns UseQueryResult ของ PaginatedResponse<CreditNote>
 * @example
 * const { data } = useCreditNote({ page: 1, perpage: 20, filter: "status:draft" });
 */
export function useCreditNote(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<CreditNote>>({
    queryKey: [QUERY_KEYS.CREDIT_NOTES, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.CREDIT_NOTE(buCode!), params);
      const res = await httpClient.get(url);
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch credit notes");
      return res.json();
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

export function useCreditNoteById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<CreditNoteDetail>({
    queryKey: [QUERY_KEYS.CREDIT_NOTES, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.CREDIT_NOTE(buCode!)}/${id}`,
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch credit note");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && !!id,
  });
}

interface CreateCnResponse {
  data: { id: string };
}

export function useCreateCreditNote() {
  return useApiMutation<CreateCnDto, CreateCnResponse>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.CREDIT_NOTE(buCode), data),
    invalidateKeys: [QUERY_KEYS.CREDIT_NOTES],
    errorMessage: "Failed to create credit note",
  });
}

export function useUpdateCreditNote() {
  return useApiMutation<CreateCnDto & { id: string }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.patch(`${API_ENDPOINTS.CREDIT_NOTE(buCode)}/${id}`, data),
    invalidateKeys: [QUERY_KEYS.CREDIT_NOTES],
    errorMessage: "Failed to update credit note",
  });
}

/**
 * Hook สำหรับ submit credit note (ส่งเข้า workflow) ที่ `/{id}/submit`
 * ส่ง body `{ doc_version }` — backend ต้องการ doc_version (optimistic lock)
 * ไม่งั้น 400 "doc_version: Required (expected number, received undefined)"
 * @returns UseMutationResult รับ `{ id, doc_version }` ของ credit note
 * @example
 * const submit = useSubmitCreditNote();
 * submit.mutate({ id: cn.id, doc_version: cn.doc_version });
 */
export function useSubmitCreditNote() {
  return useApiMutation<{ id: string; doc_version: number }>({
    mutationFn: ({ id, doc_version }, buCode) =>
      httpClient.patch(`${API_ENDPOINTS.CREDIT_NOTE(buCode)}/${id}/submit`, {
        doc_version,
      }),
    invalidateKeys: [QUERY_KEYS.CREDIT_NOTES],
    errorMessage: "Failed to submit credit note",
  });
}

export function useDeleteCreditNote() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.CREDIT_NOTE(buCode)}/${id}`),
    invalidateKeys: [QUERY_KEYS.CREDIT_NOTES],
    errorMessage: "Failed to delete credit note",
    optimisticList: {
      queryKeyPrefix: [QUERY_KEYS.CREDIT_NOTES],
      updater: removeFromListById,
    },
  });
}

// --- Comments ---

export const cnCommentCrud = createCommentCrud({
  queryKey: QUERY_KEYS.CREDIT_NOTE_COMMENTS,
  commentEndpoint: API_ENDPOINTS.CREDIT_NOTE_COMMENT,
  idFieldName: "credit_note_id",
  label: "credit note",
  cacheProfile: CACHE_DYNAMIC,
});

export const useCreditNoteComments = cnCommentCrud.useComments;
export const useCreateCreditNoteComment = cnCommentCrud.useCreate;

export const useUpdateCreditNoteComment = cnCommentCrud.useUpdate;
export const useDeleteCreditNoteComment = cnCommentCrud.useDelete;

// --- Export ---

interface ExportCreditNoteArgs {
  params?: ParamsDto;
  columns: XlsxColumn<CreditNote>[];
}

export function useExportCreditNote() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportCreditNote = async ({
    params,
    columns,
  }: ExportCreditNoteArgs) => {
    if (!buCode)
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing buCode");
    return exportToXlsx<CreditNote>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.CREDIT_NOTE(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok)
          throw await ApiError.from(res, "Failed to fetch credit notes");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Credit Notes",
      fileNamePrefix: "credit-note",
    });
  };

  return { exportCreditNote, isExporting };
}

/**
 * การเคลื่อนไหวสต๊อกของใบลดหนี้ — ยิงตอนคอมโพเนนต์ในแท็บ Stock mount เท่านั้น
 *
 * Radix ถอด `TabsContent` ที่ไม่ได้เลือกออกจาก DOM ตาราง (และ hook นี้) จึงเกิด
 * ตอนกดแท็บ ไม่ใช่ตอนเปิดฟอร์ม · `enabled` ยังกันอีกชั้นสำหรับใบที่ยังไม่ปิดจบ
 * เพราะก่อน completed ของยังไม่ขยับ ยิงไปก็ได้ใบเปล่า
 *
 * @param cnId - รหัสใบลดหนี้ (ใบใหม่ที่ยังไม่บันทึกไม่มี id → ไม่ยิง)
 * @param options.enabled - default `true`
 */
export function useCnStockMovements(
  cnId: string | undefined,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<CnStockMovement>({
    queryKey: [QUERY_KEYS.CREDIT_NOTE_STOCK_MOVEMENTS, buCode, cnId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.CREDIT_NOTE_STOCK_MOVEMENTS(buCode!, cnId!),
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch stock movements");
      const json = await res.json();
      return json.data as CnStockMovement;
    },
    enabled: !!buCode && !!cnId && (options?.enabled ?? true),
    ...CACHE_DYNAMIC,
  });
}
