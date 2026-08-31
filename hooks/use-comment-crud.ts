import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import type { CacheProfile } from "@/lib/cache-config";
import type {
  CommentAttachment,
  CommentItem,
} from "@/components/ui/comment-sheet";

interface CommentCrudOptions {
  queryKey: string;
  /** `(bu, id?) => …/{entity}-comments/{id}` — ไม่ส่ง id = path สำหรับอ้าง comment id */
  commentEndpoint: (buCode: string, entityId?: string) => string;
  /** ชื่อฟิลด์ id ของ entity ใน payload ตอนสร้าง เช่น `purchase_request_id` */
  idFieldName: string;
  label: string;
  /** cache profile ของ useComments — ไม่ระบุ = ค่า default ของ react-query */
  cacheProfile?: CacheProfile;
}

/**
 * Factory สร้างชุด hook สำหรับจัดการ comment ของ entity แต่ละประเภท (PR/PO/GRN ฯลฯ)
 * คืนชุด hook useComments/useCreate/useUpdate/useDelete และ uploadAttachment
 * ทุก mutation จะ invalidate queryKey ที่กำหนดเพื่อ refresh รายการหลัง mutate
 * @param options - ตัวเลือก queryKey, endpoint และ label ของ entity
 * @returns object ของ hook สำหรับใช้ใน component comment sheet
 * @example
 * const prCommentCrud = createCommentCrud({
 *   queryKey: QUERY_KEYS.PURCHASE_REQUEST_COMMENTS,
 *   commentEndpoint: API_ENDPOINTS.PURCHASE_REQUEST_COMMENT,
 *   idFieldName: "purchase_request_id",
 *   label: "purchase request",
 * });
 * const { data: comments } = prCommentCrud.useComments(prId);
 */
export function createCommentCrud({
  queryKey,
  commentEndpoint,
  idFieldName,
  label,
  cacheProfile,
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
          throw new ApiError(
            ERROR_CODES.VALIDATION_ERROR,
            `Missing buCode or ${label} id`,
          );
        const res = await httpClient.get(commentEndpoint(buCode, entityId));
        if (!res.ok) throw await ApiError.from(res, "Failed to fetch comments");
        const json = await res.json();
        return json.data ?? [];
      },
      ...cacheProfile,
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
      files: File[];
    }>({
      mutationFn: (data, buCode) => {
        // multipart คำขอเดียว — ข้อความกับไฟล์ไปพร้อมกัน ไม่มีขั้นอัปโหลดแยก
        const formData = new FormData();
        formData.append("message", data.message);
        formData.append("type", data.type);
        for (const file of data.files) formData.append("files", file);
        const entityId = data[idFieldName] as string | undefined;
        return httpClient.post(commentEndpoint(buCode, entityId), formData);
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

  return {
    useComments,
    useCreate,
    useUpdate,
    useDelete,
    /** The entity ID field name for create payloads */
    idFieldName,
  };
}
