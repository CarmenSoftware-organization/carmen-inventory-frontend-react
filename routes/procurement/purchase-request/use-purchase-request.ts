import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation, removeFromListById } from "@/hooks/use-api-mutation";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { createCommentCrud } from "@/hooks/use-comment-crud";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
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

/**
 * response ที่ backend ส่งมาไม่ตรง schema ที่ FE ถืออยู่ — เป็นสัญญาณว่า contract
 * เพี้ยน ไม่ใช่ error ของผู้ใช้ list จึงยังแสดงต่อด้วยข้อมูลดิบตามเดิม
 *
 * dev เห็นใน console · prod ส่งขึ้น SigNoz ให้คนที่แก้ได้เห็น (ตะโกนใส่ console
 * ของผู้ใช้ไม่มีใครอ่าน) · import telemetry แบบ dynamic เพื่อไม่ให้ลาก OTEL SDK
 * เข้า bundle หลัก แบบเดียวกับ root-error-boundary
 *
 * ส่งเฉพาะ path/code/message — ไม่เอา field อื่นของ zod issue ติดไปด้วย
 * เผื่อเวอร์ชันหน้ามันแนบค่าจริงมาแล้วข้อมูลลูกค้าหลุดขึ้น observability
 */
function reportSchemaMismatch(
  source: string,
  issues: readonly { path: PropertyKey[]; code: string; message: string }[],
) {
  if (import.meta.env.DEV) {
    console.warn(`[${source}] API schema mismatch:`, issues);
    return;
  }
  void import("@/lib/telemetry")
    .then((m) =>
      m.reportError("PR API schema mismatch", {
        source,
        extra: {
          // จำกัด 5 ข้อ — schema เปลี่ยนยกชุดจะได้ไม่ยิงเป็นร้อยทุก request
          issues: issues.slice(0, 5).map((i) => ({
            path: i.path.join("."),
            code: i.code,
            message: i.message,
          })),
          total: issues.length,
        },
      }),
    )
    .catch(() => {
      /* เงียบ — รายงานไม่ได้ต้องไม่ทำให้หน้า list พัง */
    });
}

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
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch purchase requests");
      const json = await res.json();
      const entry = json.data?.[0];

      const parsed = paginatedResponse(purchaseRequestSchema).safeParse(entry);
      if (!parsed.success) {
        reportSchemaMismatch("use-purchase-request", parsed.error.issues);
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
        throw await ApiError.from(
          res,
          "Failed to fetch my pending purchase requests",
        );
      const json = await res.json();
      const entry = json.data?.[0];

      const parsed = paginatedResponse(purchaseRequestSchema).safeParse(entry);
      if (!parsed.success) {
        reportSchemaMismatch(
          "use-purchase-request:pending",
          parsed.error.issues,
        );
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
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch workflow stages");
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

export function useCreatePurchaseRequest() {
  return useApiMutation<CreatePurchaseRequestDto, CreatePrResponse>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PURCHASE_REQUEST(buCode), data),
    invalidateKeys: [QUERY_KEYS.PURCHASE_REQUESTS],
    errorMessage: "Failed to create purchase request",
  });
}

// --- Comments ---

export const prCommentCrud = createCommentCrud({
  queryKey: QUERY_KEYS.PURCHASE_REQUEST_COMMENTS,
  commentEndpoint: API_ENDPOINTS.PURCHASE_REQUEST_COMMENT,
  idFieldName: "purchase_request_id",
  label: "purchase request",
});

export const usePurchaseRequestComments = prCommentCrud.useComments;
export const useCreatePurchaseRequestComment = prCommentCrud.useCreate;

export const useUpdatePurchaseRequestComment = prCommentCrud.useUpdate;
export const useDeletePurchaseRequestComment = prCommentCrud.useDelete;

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

export function usePrPreviousStages(prId: string | undefined, enabled = true) {
  const buCode = useBuCode();

  return useQuery<PrPreviousStage[]>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUEST_PREVIOUS_STAGES, buCode, prId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PURCHASE_REQUEST_PREVIOUS_STAGES(buCode!, prId!),
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch previous stages");
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
      httpClient.post(
        API_ENDPOINTS.PURCHASE_REQUEST_SWIPE_APPROVE(buCode),
        data,
      ),
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
      httpClient.post(
        API_ENDPOINTS.PURCHASE_REQUEST_SWIPE_REJECT(buCode),
        data,
      ),
    invalidateKeys: PR_INVALIDATE_KEYS,
    errorMessage: "Failed to batch reject purchase requests",
  });
}

/**
 * Hook ลบ PR หลายใบพร้อมกัน
 *
 * DELETE ไปที่ `/{buCode}/purchase-requests/batch` พร้อม body `{ ids }` —
 * invalidate ทั้ง list และ my-pending ให้ backend เป็นคนเติมแถวที่หายให้ครบหน้า
 * (ไม่ทำ optimistic เพราะลบทีละหลายใบ ถ้าพลาดกลางทางแถวจะหายไปทั้งที่ยังอยู่)
 *
 * @returns Mutation สำหรับลบ PR หลายใบ
 * @example
 * const batch = useBatchDeletePurchaseRequest();
 * batch.mutate({ ids: selectedIds });
 */
export function useBatchDeletePurchaseRequest() {
  return useApiMutation<{ ids: string[] }>({
    mutationFn: (data, buCode) =>
      httpClient.delete(API_ENDPOINTS.PURCHASE_REQUEST_BATCH(buCode), {
        body: data,
      }),
    invalidateKeys: PR_INVALIDATE_KEYS,
    errorMessage: "Failed to delete purchase requests",
  });
}

// --- Export ---

interface ExportPurchaseRequestArgs {
  params?: ParamsDto;
  viewMode: "my-pending" | "all-document";
  columns: XlsxColumn<PurchaseRequest>[];
}

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
        if (!res.ok)
          throw await ApiError.from(res, "Failed to fetch purchase requests");
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
