import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import type {
  CommentAttachment,
  CommentItem,
} from "@/components/ui/comment-sheet";

interface CommentCrudOptions {
  queryKey: string;
  entityEndpoint: (buCode: string) => string;
  commentEndpoint: (buCode: string, entityId?: string) => string;
  attachmentEndpoint: (buCode: string, entityId: string) => string;
  idFieldName: string;
  label: string;
}

/**
 * Factory สร้างชุด hook สำหรับจัดการ comment ของ entity แต่ละประเภท (PR/PO/GRN ฯลฯ)
 * คืนชุด hook useComments/useCreate/useUpdate/useDelete และ uploadAttachment
 * ทุก mutation จะ invalidate queryKey ที่กำหนดเพื่อ refresh รายการหลัง mutate
 * @param options - ตัวเลือก queryKey, endpoint และ label ของ entity
 * @returns object ของ hook สำหรับใช้ใน component comment sheet
 * @example
 * const prCommentCrud = createCommentCrud({
 *   queryKey: QUERY_KEYS.PR_COMMENTS,
 *   entityEndpoint: (bu) => API_ENDPOINTS.PURCHASE_REQUESTS(bu),
 *   commentEndpoint: (bu) => `${API_ENDPOINTS.PURCHASE_REQUESTS(bu)}/comment`,
 *   attachmentEndpoint: (bu, id) => `${API_ENDPOINTS.PURCHASE_REQUESTS(bu)}/${id}/attachment`,
 *   idFieldName: "pr_id",
 *   label: "purchase request",
 * });
 * const { data: comments } = prCommentCrud.useComments(prId);
 */
export function createCommentCrud({
  queryKey,
  entityEndpoint,
  commentEndpoint,
  attachmentEndpoint,
  idFieldName,
  label,
}: CommentCrudOptions) {
  /**
   * Hook ดึงรายการ comment ของ entity ตาม id
   * @param entityId - id ของ entity
   * @returns UseQueryResult ของ CommentItem[]
   */
  function useComments(
    entityId: string | undefined,
  ): UseQueryResult<CommentItem[]> {
    const buCode = useBuCode();

    return useQuery<CommentItem[]>({
      queryKey: [queryKey, buCode, entityId],
      queryFn: async () => {
        if (!buCode || !entityId)
          throw new Error(`Missing buCode or ${label} id`);
        const res = await httpClient.get(
          `${entityEndpoint(buCode)}/${entityId}/comment`,
        );
        if (!res.ok) throw new Error("Failed to fetch comments");
        const json = await res.json();
        return json.data ?? [];
      },
      enabled: !!buCode && !!entityId,
    });
  }

  /**
   * Hook สำหรับสร้าง comment ใหม่บน entity
   * @returns UseMutationResult สำหรับส่ง comment พร้อม attachments
   */
  function useCreate() {
    return useApiMutation<{
      [key: string]: unknown;
      message: string;
      type: string;
      attachments: CommentAttachment[];
    }>({
      mutationFn: (data, buCode) => {
        const entityId = data[idFieldName] as string | undefined;
        return httpClient.post(commentEndpoint(buCode, entityId), data);
      },
      invalidateKeys: [queryKey],
      errorMessage: "Failed to add comment",
    });
  }

  /**
   * Hook สำหรับแก้ไข comment ที่มีอยู่
   * @returns UseMutationResult สำหรับอัพเดต comment
   */
  function useUpdate() {
    return useApiMutation<{
      id: string;
      message: string;
      attachments: CommentAttachment[];
      [key: string]: unknown;
    }>({
      mutationFn: ({ id, ...data }, buCode) => {
        const entityId = data[idFieldName] as string | undefined;
        return httpClient.patch(
          `${commentEndpoint(buCode, entityId)}/${id}`,
          data,
        );
      },
      invalidateKeys: [queryKey],
      errorMessage: "Failed to update comment",
    });
  }

  /**
   * Hook สำหรับลบ comment ตาม id
   * @returns UseMutationResult สำหรับลบ comment
   */
  function useDelete() {
    return useApiMutation<string | { id: string; entityId?: string }>({
      mutationFn: (payload, buCode) => {
        const id = typeof payload === "string" ? payload : payload.id;
        const entityId =
          typeof payload === "string" ? undefined : payload.entityId;
        return httpClient.delete(`${commentEndpoint(buCode, entityId)}/${id}`);
      },
      invalidateKeys: [queryKey],
      errorMessage: "Failed to delete comment",
    });
  }

  /**
   * อัปโหลดไฟล์แนบของ comment ผ่าน multipart/form-data
   * @param buCode - รหัส business unit
   * @param entityId - id ของ entity เจ้าของ comment
   * @param file - ไฟล์ที่ต้องการอัปโหลด
   * @returns ข้อมูล CommentAttachment ที่อัปโหลดแล้ว
   */
  async function uploadAttachment(
    buCode: string,
    entityId: string,
    file: File,
  ): Promise<CommentAttachment> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await httpClient.post(
      attachmentEndpoint(buCode, entityId),
      formData,
    );

    if (!res.ok) throw new Error("Failed to upload attachment");
    const json = await res.json();
    return json.data;
  }

  return {
    useComments,
    useCreate,
    useUpdate,
    useDelete,
    uploadAttachment,
    /** The entity ID field name for create payloads */
    idFieldName,
  };
}
