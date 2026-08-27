import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  StoreRequisition,
  CreateStoreRequisitionDto,
  SrStockMovement,
} from "@/types/store-requisition";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import type {
  CommentAttachment,
  CommentItem,
} from "@/components/ui/comment-sheet";
import { CACHE_DYNAMIC, CACHE_STATIC } from "@/lib/cache-config";

export interface SrPreviousStage {
  key: string;
  name: string;
}

/**
 * ดึงรายการ stage ก่อนหน้า (previous stages) ของ SR สำหรับ send-back picker
 * API คืน object map แล้ว transform เป็น array ของ { key, name } (เหมือน PR)
 * @param srId - รหัส SR
 * @param enabled - เปิด/ปิดการ fetch (เช่นเปิดเฉพาะตอน dialog เปิด)
 */
export function useSrPreviousStages(srId: string | undefined, enabled = true) {
  const buCode = useBuCode();

  return useQuery<SrPreviousStage[]>({
    queryKey: [QUERY_KEYS.STORE_REQUISITION_PREVIOUS_STAGES, buCode, srId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.STORE_REQUISITION_PREVIOUS_STAGES(buCode!, srId!),
      );
      if (!res.ok) throw new Error("Failed to fetch previous stages");
      const json = await res.json();
      const data = json.data ?? {};
      return Object.entries(data).map(([key, label]) => ({
        key,
        name: label as string,
      }));
    },
    enabled: !!buCode && !!srId && enabled,
  });
}

/**
 * การเคลื่อนไหวสต๊อกของใบเบิกใบเดียว (แท็บ Stock Movement)
 *
 * **ยิงตอนแท็บถูกเปิดเท่านั้น** — Radix ถอด `TabsContent` ที่ไม่ได้เลือกออกจาก DOM
 * คอมโพเนนต์ที่เรียก hook นี้จึง mount ตอนคลิกแท็บ ไม่ใช่ตอนเปิดฟอร์ม คนที่เข้ามา
 * แก้ใบแล้วไม่เคยกดแท็บนี้จึงไม่ต้องจ่ายค่า request เลย (อย่าเผลอใส่ `forceMount`
 * ให้ TabsContent ตัวนั้น ไม่งั้น lazy ตรงนี้หายไปเงียบ ๆ)
 *
 * backend แตกขาเข้า/ขาออกมาให้แล้วใน `items` — ฝั่ง client ไม่ต้องคำนวณอะไรอีก
 *
 * ผู้เรียกที่ไม่ได้อยู่ในแท็บ (เช่น footer ที่ต้องโชว์ยอดสรุป) ต้องส่ง `enabled`
 * ตามแท็บที่เปิดอยู่เอง ไม่งั้นความ lazy ข้างบนหายทันที — key เดียวกันทั้งสองที่
 * react-query จึงยิงครั้งเดียวแล้วแชร์ผลกัน
 *
 * @param srId - รหัสใบเบิก (ใบใหม่ที่ยังไม่บันทึกไม่มี id → ไม่ยิง)
 * @param options.enabled - default `true` (คอมโพเนนต์ในแท็บ mount = ถึงเวลายิงแล้ว)
 */
export function useSrStockMovements(
  srId: string | undefined,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<SrStockMovement>({
    queryKey: [QUERY_KEYS.STORE_REQUISITION_STOCK_MOVEMENTS, buCode, srId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.STORE_REQUISITION_STOCK_MOVEMENTS(buCode!, srId!),
      );
      if (!res.ok) throw new Error("Failed to fetch stock movements");
      const json = await res.json();
      return json.data as SrStockMovement;
    },
    enabled: !!buCode && !!srId && (options?.enabled ?? true),
    ...CACHE_DYNAMIC,
  });
}

export function useStoreRequisition(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<StoreRequisition>>({
    queryKey: [QUERY_KEYS.STORE_REQUISITIONS, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(API_ENDPOINTS.STORE_REQUISITIONS, {
        bu_code: buCode,
        ...params,
      });
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch store requisitions");
      const json = await res.json();
      const entry = json.data?.[0];
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
 * Hook ดึงรายชื่อ workflow stages ของ SR ใน business unit ปัจจุบัน
 * ใช้สำหรับแสดง stage filter และจะไม่ fetch จนกว่า buCode จะพร้อม
 * @returns React Query ของ string[] (รายชื่อ stage)
 * @example
 * const { data: stages = [] } = useStoreRequisitionWorkflowStages();
 */
export function useStoreRequisitionWorkflowStages() {
  const buCode = useBuCode();

  return useQuery<string[]>({
    queryKey: [QUERY_KEYS.STORE_REQUISITION_WORKFLOW_STAGES, buCode],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(
        API_ENDPOINTS.STORE_REQUISITION_WORKFLOW_STAGES(buCode),
      );
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch workflow stages");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode,
    ...CACHE_STATIC,
  });
}

export function useMyPendingStoreRequisition(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<StoreRequisition>>({
    queryKey: [QUERY_KEYS.MY_PENDING_STORE_REQUISITIONS, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(API_ENDPOINTS.MY_PENDING_STORE_REQUISITIONS, {
        bu_code: buCode,
        ...params,
      });
      const res = await httpClient.get(url);
      if (!res.ok)
        throw new Error("Failed to fetch my pending store requisitions");
      const json = await res.json();

      return {
        data: json.data[0].data ?? [],
        paginate: json.paginate ?? {
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

export function useStoreRequisitionById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<StoreRequisition>({
    queryKey: [QUERY_KEYS.STORE_REQUISITIONS, buCode, id],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        `${API_ENDPOINTS.STORE_REQUISITION(buCode)}/${id}`,
      );
      if (!res.ok) throw new Error("Failed to fetch store requisition");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && !!id,
  });
}

const SR_INVALIDATE_KEYS = [
  QUERY_KEYS.STORE_REQUISITIONS,
  QUERY_KEYS.MY_PENDING_STORE_REQUISITIONS,
];

export function useCreateStoreRequisition() {
  return useApiMutation<CreateStoreRequisitionDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.STORE_REQUISITION(buCode), data),
    invalidateKeys: SR_INVALIDATE_KEYS,
    errorMessage: "Failed to create store requisition",
  });
}

export function useUpdateStoreRequisition() {
  return useApiMutation<CreateStoreRequisitionDto & { id: string }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.put(`${API_ENDPOINTS.STORE_REQUISITION(buCode)}/${id}`, data),
    invalidateKeys: SR_INVALIDATE_KEYS,
    errorMessage: "Failed to update store requisition",
  });
}

export type SrAction = "submit" | "approve" | "reject" | "review";

export interface SrStageDetail {
  id: string;
  stage_status: string;
  stage_message?: string | null;
  approved_qty?: number;
  issued_qty?: number;
}

export interface SrActionPayload {
  id: string;
  stage_role: string;
  doc_version?: number;
  des_stage?: string;
  details: SrStageDetail[];
}

export function useSrAction(action: SrAction) {
  return useApiMutation<SrActionPayload>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.STORE_REQUISITION(buCode)}/${id}/${action}`,
        data,
      ),
    invalidateKeys: SR_INVALIDATE_KEYS,
    errorMessage: `Failed to ${action} store requisition`,
  });
}

export const useSubmitStoreRequisition = () => useSrAction("submit");
export const useApproveStoreRequisition = () => useSrAction("approve");
export const useIssueStoreRequisition = () => useSrAction("approve");
export const useRejectStoreRequisition = () => useSrAction("reject");
export const useReviewStoreRequisition = () => useSrAction("review");

export function useDeleteStoreRequisition() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.STORE_REQUISITION(buCode)}/${id}`),
    invalidateKeys: SR_INVALIDATE_KEYS,
    errorMessage: "Failed to delete store requisition",
  });
}

const SR_COMMENT_INVALIDATE_KEYS = [QUERY_KEYS.STORE_REQUISITION_COMMENTS];

/** ดึงความคิดเห็นของ SR ตาม sr id */
export function useStoreRequisitionComments(
  srId: string | undefined,
): UseQueryResult<CommentItem[]> {
  const buCode = useBuCode();

  return useQuery<CommentItem[]>({
    queryKey: [QUERY_KEYS.STORE_REQUISITION_COMMENTS, buCode, srId],
    queryFn: async () => {
      if (!buCode || !srId) throw new Error("Missing buCode or sr id");
      const res = await httpClient.get(
        API_ENDPOINTS.STORE_REQUISITION_COMMENT(buCode, srId),
      );
      if (!res.ok) throw new Error("Failed to fetch comments");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!srId,
  });
}

export function useCreateStoreRequisitionComment() {
  return useApiMutation<{
    store_requisition_id: string;
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
        API_ENDPOINTS.STORE_REQUISITION_COMMENT(
          buCode,
          data.store_requisition_id,
        ),
        formData,
      );
    },
    invalidateKeys: SR_COMMENT_INVALIDATE_KEYS,
    errorMessage: "Failed to add comment",
  });
}

/** แก้ไขความคิดเห็นใน SR ตาม comment id */
export function useUpdateStoreRequisitionComment() {
  return useApiMutation<{
    id: string;
    message: string;
    attachments: CommentAttachment[];
    [key: string]: unknown;
  }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.STORE_REQUISITION_COMMENT(buCode)}/${id}`,
        data,
      ),
    invalidateKeys: SR_COMMENT_INVALIDATE_KEYS,
    errorMessage: "Failed to update comment",
  });
}

/** ลบความคิดเห็นใน SR ตาม comment id */
export function useDeleteStoreRequisitionComment() {
  return useApiMutation<string | { id: string; entityId?: string }>({
    mutationFn: (payload, buCode) => {
      const id = typeof payload === "string" ? payload : payload.id;
      return httpClient.delete(
        `${API_ENDPOINTS.STORE_REQUISITION_COMMENT(buCode)}/${id}`,
      );
    },
    invalidateKeys: SR_COMMENT_INVALIDATE_KEYS,
    errorMessage: "Failed to delete comment",
  });
}

// --- Export ---

interface ExportStoreRequisitionArgs {
  params?: ParamsDto;
  viewMode: "my-pending" | "all-document";
  columns: XlsxColumn<StoreRequisition>[];
}

/**
 * Hook ส่งออก SR เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list (เลือกตาม viewMode) — caller กำหนด columns พร้อม translation
 * @returns { exportStoreRequisition, isExporting }
 */
export function useExportStoreRequisition() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportStoreRequisition = async ({
    params,
    viewMode,
    columns,
  }: ExportStoreRequisitionArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    const endpoint =
      viewMode === "my-pending"
        ? API_ENDPOINTS.MY_PENDING_STORE_REQUISITIONS
        : API_ENDPOINTS.STORE_REQUISITIONS;
    return exportToXlsx<StoreRequisition>({
      fetch: async () => {
        const url = buildUrl(endpoint, { bu_code: buCode, ...params });
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch store requisitions");
        const json = await res.json();
        return json.data?.[0]?.data ?? [];
      },
      columns,
      sheetName: "Store Requisitions",
      fileNamePrefix: "store-requisition",
    });
  };

  return { exportStoreRequisition, isExporting };
}
