import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation, removeFromListById } from "@/hooks/use-api-mutation";
import { createCommentCrud } from "@/hooks/use-comment-crud";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { CreditNote, CreditNoteDetail, CreateCnDto } from "@/types/credit-note";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import type { CommentItem } from "@/components/ui/comment-sheet";
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
        throw ApiError.fromResponse(res, "Failed to fetch credit notes");
      return res.json();
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook ดึง credit note เดี่ยวตาม id สำหรับหน้า view/edit
 * จะ fetch เฉพาะเมื่อ buCode และ id พร้อมทั้งคู่
 * @param id - id ของ credit note (undefined = ไม่ fetch)
 * @returns UseQueryResult ของ CreditNote
 * @example
 * const { data: cn } = useCreditNoteById(params.id);
 */
export function useCreditNoteById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<CreditNoteDetail>({
    queryKey: [QUERY_KEYS.CREDIT_NOTES, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.CREDIT_NOTE(buCode!)}/${id}`,
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch credit note");
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

/**
 * Hook สำหรับสร้าง credit note ใหม่ พร้อม invalidate รายการหลัง success
 * @returns UseMutationResult รับ CreateCnDto คืน { data: { id } }
 * @example
 * const create = useCreateCreditNote();
 * await create.mutateAsync(formValues);
 */
export function useCreateCreditNote() {
  return useApiMutation<CreateCnDto, CreateCnResponse>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.CREDIT_NOTE(buCode), data),
    invalidateKeys: [QUERY_KEYS.CREDIT_NOTES],
    errorMessage: "Failed to create credit note",
  });
}

/**
 * Hook สำหรับแก้ไข credit note ที่มีอยู่ (PUT) พร้อม invalidate รายการ
 * @returns UseMutationResult รับ CreateCnDto + id
 * @example
 * const update = useUpdateCreditNote();
 * await update.mutateAsync({ id: cn.id, ...values });
 */
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
 * ไม่ต้องส่ง body — backend ใช้ข้อมูลของเอกสารที่บันทึกไว้แล้ว
 * @returns UseMutationResult รับ id ของ credit note
 * @example
 * const submit = useSubmitCreditNote();
 * submit.mutate(cn.id);
 */
export function useSubmitCreditNote() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.patch(`${API_ENDPOINTS.CREDIT_NOTE(buCode)}/${id}/submit`),
    invalidateKeys: [QUERY_KEYS.CREDIT_NOTES],
    errorMessage: "Failed to submit credit note",
  });
}

/**
 * Hook สำหรับลบ credit note พร้อม optimistic update รายการใน cache
 * จะลบรายการออกจาก list ทันทีและ rollback หากเกิด error
 * @returns UseMutationResult รับ id ของ credit note ที่จะลบ
 * @example
 * const del = useDeleteCreditNote();
 * del.mutate(cn.id);
 */
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

const cnCommentCrud = createCommentCrud({
  queryKey: QUERY_KEYS.CREDIT_NOTE_COMMENTS,
  entityEndpoint: API_ENDPOINTS.CREDIT_NOTE,
  commentEndpoint: API_ENDPOINTS.CREDIT_NOTE_COMMENT,
  attachmentEndpoint: API_ENDPOINTS.CREDIT_NOTE_COMMENT_ATTACHMENT,
  idFieldName: "credit_note_id",
  label: "credit note",
});

/**
 * ดึง comment ของ credit note จาก
 * `/api/{buCode}/credit-note-comment/{cnId}`
 */
export function useCreditNoteComments(cnId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<CommentItem[]>({
    queryKey: [QUERY_KEYS.CREDIT_NOTE_COMMENTS, buCode, cnId],
    queryFn: async () => {
      if (!buCode || !cnId)
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          "Missing buCode or credit note id",
        );
      const res = await httpClient.get(
        API_ENDPOINTS.CREDIT_NOTE_COMMENT(buCode, cnId),
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch comments");
      const json = await res.json();
      return json.data ?? [];
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && !!cnId,
  });
}

/** Hook สำหรับแก้ไข comment ของ credit note */
export const useUpdateCreditNoteComment = cnCommentCrud.useUpdate;
/** Hook สำหรับลบ comment ของ credit note */
export const useDeleteCreditNoteComment = cnCommentCrud.useDelete;

/**
 * สร้าง comment ของ credit note ผ่าน multipart/form-data
 * ส่ง message + type + files ในคำขอเดียวไปยัง
 * `/api/{buCode}/credit-note-comment/{cnId}`
 */
export function useCreateCreditNoteComment() {
  return useApiMutation<{
    credit_note_id: string;
    message: string;
    type: string;
    files: File[];
  }>({
    mutationFn: (data, buCode) => {
      const formData = new FormData();
      formData.append("message", data.message);
      formData.append("type", data.type);
      for (const file of data.files) {
        formData.append("files", file);
      }
      return httpClient.post(
        API_ENDPOINTS.CREDIT_NOTE_COMMENT(buCode, data.credit_note_id),
        formData,
      );
    },
    invalidateKeys: [QUERY_KEYS.CREDIT_NOTE_COMMENTS],
    errorMessage: "Failed to add comment",
  });
}

// --- Export ---

interface ExportCreditNoteArgs {
  params?: ParamsDto;
  columns: XlsxColumn<CreditNote>[];
}

/**
 * Hook ส่งออก CN เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportCreditNote, isExporting }
 */
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
          throw ApiError.fromResponse(res, "Failed to fetch credit notes");
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
