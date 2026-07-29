import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation, removeFromListById } from "@/hooks/use-api-mutation";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { createCommentCrud } from "@/hooks/use-comment-crud";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  PurchaseRequest,
  PurchaseRequestTemplate,
  CreatePurchaseRequestDto,
  PrActionPayload,
  SplitActionDto,
} from "@/types/purchase-request";
import { purchaseRequestSchema } from "@/types/purchase-request";
import { paginatedResponse } from "@/lib/api-schemas";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC, CACHE_STATIC, CACHE_NORMAL } from "@/lib/cache-config";
import type { ActionPr } from "@/types/stage-role";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import type { CommentItem } from "@/components/ui/comment-sheet";

/**
 * Hook ดึงรายการใบขอซื้อ (Purchase Request) ทั้งหมด
 * ใช้ CACHE_DYNAMIC และ validate schema ด้วย zod (warn ถ้าไม่ตรง)
 * Unwrap section แรกจาก response เป็น paginated มาตรฐาน
 * @param params - พารามิเตอร์ filter/sort/pagination
 * @param options - ตัวเลือกเสริม เช่น enabled
 * @returns React Query ของ PaginatedResponse<PurchaseRequest>
 * @example
 * const { data } = usePurchaseRequest({ page: 1, perpage: 20 });
 */
export function usePurchaseRequest(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<PurchaseRequest>>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUESTS, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(API_ENDPOINTS.PURCHASE_REQUESTS, {
        bu_code: buCode,
        ...params,
      });
      const res = await httpClient.get(url);
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch purchase requests");
      const json = await res.json();
      const entry = json.data?.[0];

      const parsed = paginatedResponse(purchaseRequestSchema).safeParse(entry);
      if (!parsed.success) {
        console.warn("[PR] API schema mismatch:", parsed.error.issues);
      }

      return {
        data: entry?.data ?? [],
        paginate: entry?.paginate ?? {
          total: 0,
          page: 1,
          perpage: 10,
          pages: 0,
        },
      };
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook ดึง PR ที่รอให้ผู้ใช้ปัจจุบันดำเนินการใน workflow
 * ใช้ endpoint my-pending พร้อมตรวจ schema และ unwrap section แรก
 * @param params - พารามิเตอร์ filter/sort/pagination
 * @param options - ตัวเลือกเสริม เช่น enabled
 * @returns React Query ของ PaginatedResponse<PurchaseRequest>
 * @example
 * const { data } = useMyPendingPurchaseRequest({ page: 1 });
 */
export function useMyPendingPurchaseRequest(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<PurchaseRequest>>({
    queryKey: [QUERY_KEYS.MY_PENDING_PURCHASE_REQUESTS, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(API_ENDPOINTS.MY_PENDING_PURCHASE_REQUESTS, {
        bu_code: buCode,
        ...params,
      });
      const res = await httpClient.get(url);
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch my pending purchase requests");
      const json = await res.json();
      const entry = json.data?.[0];

      const parsed = paginatedResponse(purchaseRequestSchema).safeParse(entry);
      if (!parsed.success) {
        console.warn("[PR pending] API schema mismatch:", parsed.error.issues);
      }

      return {
        data: entry?.data ?? [],
        paginate: entry?.paginate ?? {
          total: 0,
          page: 1,
          perpage: 10,
          pages: 0,
        },
      };
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook ดึงรายชื่อ workflow stages ของ PR ใน business unit ปัจจุบัน
 * ใช้สำหรับแสดง stage filter และจะไม่ fetch จนกว่า buCode จะพร้อม
 * @returns React Query ของ string[] (รายชื่อ stage)
 * @example
 * const { data: stages = [] } = usePurchaseRequestWorkflowStages();
 */
export function usePurchaseRequestWorkflowStages() {
  const buCode = useBuCode();

  return useQuery<string[]>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUEST_WORKFLOW_STAGES, buCode],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(
        API_ENDPOINTS.PURCHASE_REQUEST_WORKFLOW_STAGES(buCode),
      );
      const res = await httpClient.get(url);
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch workflow stages");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode,
    ...CACHE_STATIC,
  });
}

/**
 * Hook ดึงรายการ template ของ PR ทั้งหมดใน BU ปัจจุบัน
 * ใช้เมื่อต้องการ lookup PRT ในหน้าสร้าง PR จะไม่ fetch จนกว่า buCode และ enabled
 * @param enabled - เปิด/ปิดการ fetch (default true)
 * @returns React Query ของ PurchaseRequestTemplate[]
 * @example
 * const { data: templates } = usePurchaseRequestTemplates(open);
 */
export function usePurchaseRequestTemplates(enabled: boolean = true) {
  const buCode = useBuCode();

  return useQuery<PurchaseRequestTemplate[]>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUEST_TEMPLATES, buCode],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        API_ENDPOINTS.PURCHASE_REQUEST_TEMPLATES(buCode),
      );
      if (!res.ok)
        throw await ApiError.from(
          res,
          "Failed to fetch purchase request templates",
        );
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && enabled,
    ...CACHE_NORMAL,
  });
}

/**
 * Hook ดึงข้อมูล PR ตาม id แบบเดี่ยว
 * Unwrap data จาก response และจะไม่ fetch จนกว่า buCode และ id จะพร้อม
 * @param id - รหัส PR
 * @returns React Query ของ PurchaseRequest
 * @example
 * const { data: pr } = usePurchaseRequestById(params.id);
 */
export function usePurchaseRequestById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<PurchaseRequest>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUESTS, buCode, id],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        `${API_ENDPOINTS.PURCHASE_REQUEST(buCode)}/${id}`,
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch purchase request");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
    ...CACHE_DYNAMIC,
  });
}

interface CreatePrResponse {
  data: PurchaseRequest;
}

/**
 * Hook สร้าง PR ใหม่ผ่าน POST
 * Invalidate PURCHASE_REQUESTS cache เมื่อสำเร็จและคืน data.id ของ PR ที่สร้าง
 * @returns Mutation สำหรับสร้าง PR
 * @example
 * const create = useCreatePurchaseRequest();
 * const res = await create.mutateAsync(payload);
 */
export function useCreatePurchaseRequest() {
  return useApiMutation<CreatePurchaseRequestDto, CreatePrResponse>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PURCHASE_REQUEST(buCode), data),
    invalidateKeys: [QUERY_KEYS.PURCHASE_REQUESTS],
    errorMessage: "Failed to create purchase request",
  });
}

// --- Comments ---

const prCommentCrud = createCommentCrud({
  queryKey: QUERY_KEYS.PURCHASE_REQUEST_COMMENTS,
  entityEndpoint: API_ENDPOINTS.PURCHASE_REQUEST,
  commentEndpoint: API_ENDPOINTS.PURCHASE_REQUEST_COMMENT,
  attachmentEndpoint: API_ENDPOINTS.PURCHASE_REQUEST_COMMENT_ATTACHMENT,
  idFieldName: "purchase_request_id",
  label: "purchase request",
});

/**
 * ดึงความคิดเห็นของ PR จาก
 * `/api/{buCode}/purchase-request-comment/{prId}`
 */
export function usePurchaseRequestComments(prId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<CommentItem[]>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUEST_COMMENTS, buCode, prId],
    queryFn: async () => {
      if (!buCode || !prId)
        throw new Error("Missing buCode or purchase request id");
      const res = await httpClient.get(
        API_ENDPOINTS.PURCHASE_REQUEST_COMMENT(buCode, prId),
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch comments");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!prId,
  });
}

/** แก้ไขความคิดเห็นใน PR */
export const useUpdatePurchaseRequestComment = prCommentCrud.useUpdate;
/** ลบความคิดเห็นใน PR */
export const useDeletePurchaseRequestComment = prCommentCrud.useDelete;

/**
 * สร้างความคิดเห็นใน PR ผ่าน multipart/form-data
 * ส่ง message + type + files ในคำขอเดียวไปยัง
 * `/api/{buCode}/purchase-request-comment/{prId}`
 */
export function useCreatePurchaseRequestComment() {
  return useApiMutation<{
    purchase_request_id: string;
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
        API_ENDPOINTS.PURCHASE_REQUEST_COMMENT(
          buCode,
          data.purchase_request_id,
        ),
        formData,
      );
    },
    invalidateKeys: [QUERY_KEYS.PURCHASE_REQUEST_COMMENTS],
    errorMessage: "Failed to add comment",
  });
}

/**
 * Hook ลบ PR พร้อม optimistic update รายการ
 * ลบ item ออกจาก list cache ทันทีและ rollback หาก API ล้มเหลว
 * @returns Mutation สำหรับลบ PR
 * @example
 * const del = useDeletePurchaseRequest();
 * del.mutate(prId);
 */
export function useDeletePurchaseRequest() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.PURCHASE_REQUEST(buCode)}/${id}`),
    invalidateKeys: [QUERY_KEYS.PURCHASE_REQUESTS],
    errorMessage: "Failed to delete purchase request",
    optimisticList: {
      queryKeyPrefix: [QUERY_KEYS.PURCHASE_REQUESTS],
      updater: removeFromListById,
    },
  });
}

// --- Workflow Action Hooks ---

const PR_INVALIDATE_KEYS = [
  QUERY_KEYS.PURCHASE_REQUESTS,
  QUERY_KEYS.MY_PENDING_PURCHASE_REQUESTS,
];

/**
 * Hook ครอบคลุม action ทั้งหมดของ PR: แก้ไขทั่วไปหรือ workflow action
 * Append /{action} ต่อท้าย URL ถ้ามี action (submit/approve/reject/review/...) ถ้าไม่มีเป็น PATCH update ปกติ
 * Invalidate ทั้ง PURCHASE_REQUESTS และ MY_PENDING_PURCHASE_REQUESTS
 * @param action - workflow action (ไม่ระบุ = update ทั่วไป)
 * @returns Mutation สำหรับ action ที่เลือก
 * @example
 * const update = useUpdatePr();
 * const approve = useUpdatePr<ApprovePayload>("approve");
 */
export function useUpdatePr<T extends { id: string } = PrActionPayload>(
  action?: ActionPr,
) {
  return useApiMutation<T>({
    mutationFn: ({ id, ...data }, buCode) => {
      let url = `${API_ENDPOINTS.PURCHASE_REQUEST(buCode)}/${id}`;
      if (action) url += `/${action}`;
      return httpClient.patch(url, data);
    },
    invalidateKeys: PR_INVALIDATE_KEYS,
    errorMessage: `Failed to ${action ?? "update"} purchase request`,
  });
}

export interface PrPreviousStage {
  key: string;
  name: string;
}

/**
 * Hook ดึงรายการ stage ก่อนหน้าของ PR (สำหรับ send-back review)
 * API คืน object map แล้ว transform เป็น array ของ { key, name }
 * @param prId - รหัส PR
 * @param enabled - เปิด/ปิดการ fetch (default true)
 * @returns React Query ของรายการ PrPreviousStage[]
 * @example
 * const { data } = usePrPreviousStages(prId, isOpen);
 */
export function usePrPreviousStages(
  prId: string | undefined,
  enabled = true,
) {
  const buCode = useBuCode();

  return useQuery<PrPreviousStage[]>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUEST_PREVIOUS_STAGES, buCode, prId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PURCHASE_REQUEST_PREVIOUS_STAGES(buCode!, prId!),
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch previous stages");
      const json = await res.json();
      const data = json.data ?? {};
      return Object.entries(data).map(([key, label]) => ({
        name: label as string,
        key,
      }));
    },
    enabled: !!buCode && !!prId && enabled,
  });
}

interface SplitResponse {
  data: { id: string };
}

/**
 * Hook แยก (split) รายการบางส่วนของ PR ออกเป็น PR ใหม่
 * POST /{id}/split พร้อมรายการ item ที่ต้องการแยก คืน id ของ PR ใหม่
 * @returns Mutation สำหรับ split PR
 * @example
 * const split = useSplitPurchaseRequest();
 * const res = await split.mutateAsync({ id, item_ids });
 */
export function useSplitPurchaseRequest() {
  return useApiMutation<SplitActionDto, SplitResponse>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.post(
        `${API_ENDPOINTS.PURCHASE_REQUEST(buCode)}/${id}/split`,
        data,
      ),
    invalidateKeys: PR_INVALIDATE_KEYS,
    errorMessage: "Failed to split purchase request",
  });
}

// --- Batch Actions ---

interface BatchApprovePayload {
  pr_ids: string[];
}

interface BatchRejectPayload {
  pr_ids: string[];
  reject_message: string;
}

/**
 * Hook อนุมัติ PR หลายรายการพร้อมกัน (swipe approve)
 * POST ไปยัง endpoint swipe-approve พร้อม pr_ids หลายตัว
 * @returns Mutation สำหรับ batch approve PR
 * @example
 * const batch = useBatchApprovePurchaseRequest();
 * batch.mutate({ pr_ids: selectedIds });
 */
export function useBatchApprovePurchaseRequest() {
  return useApiMutation<BatchApprovePayload>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PURCHASE_REQUEST_SWIPE_APPROVE(buCode), data),
    invalidateKeys: PR_INVALIDATE_KEYS,
    errorMessage: "Failed to batch approve purchase requests",
  });
}

/**
 * Hook ปฏิเสธ PR หลายรายการพร้อมกัน (swipe reject)
 * POST ไปยัง endpoint swipe-reject พร้อม pr_ids และ reject_message
 * @returns Mutation สำหรับ batch reject PR
 * @example
 * const batch = useBatchRejectPurchaseRequest();
 * batch.mutate({ pr_ids, reject_message: "Out of budget" });
 */
export function useBatchRejectPurchaseRequest() {
  return useApiMutation<BatchRejectPayload>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PURCHASE_REQUEST_SWIPE_REJECT(buCode), data),
    invalidateKeys: PR_INVALIDATE_KEYS,
    errorMessage: "Failed to batch reject purchase requests",
  });
}

// --- Export ---

interface ExportPurchaseRequestArgs {
  params?: ParamsDto;
  viewMode: "my-pending" | "all-document";
  columns: XlsxColumn<PurchaseRequest>[];
}

/**
 * Hook ส่งออก PR เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list (เลือกตาม viewMode) — caller กำหนด columns พร้อม translation
 * @returns { exportPurchaseRequest, isExporting }
 */
export function useExportPurchaseRequest() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportPurchaseRequest = async ({
    params,
    viewMode,
    columns,
  }: ExportPurchaseRequestArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    const endpoint =
      viewMode === "my-pending"
        ? API_ENDPOINTS.MY_PENDING_PURCHASE_REQUESTS
        : API_ENDPOINTS.PURCHASE_REQUESTS;
    return exportToXlsx<PurchaseRequest>({
      fetch: async () => {
        const url = buildUrl(endpoint, { bu_code: buCode, ...params });
        const res = await httpClient.get(url);
        if (!res.ok) throw await ApiError.from(res, "Failed to fetch purchase requests");
        const json = await res.json();
        return json.data?.[0]?.data ?? [];
      },
      columns,
      sheetName: "Purchase Requests",
      fileNamePrefix: "purchase-request",
    });
  };

  return { exportPurchaseRequest, isExporting };
}
