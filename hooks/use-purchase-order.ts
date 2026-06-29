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
import type {
  PurchaseOrder,
  CreatePoDto,
  PoForGrn,
  VendorForGrn,
} from "@/types/purchase-order";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import type { CommentItem } from "@/components/ui/comment-sheet";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/**
 * Hook ดึงรายการใบสั่งซื้อ (Purchase Order) ทั้งหมด
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เพราะสถานะ PO เปลี่ยนบ่อย
 * จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์ filter/sort/pagination
 * @param options - ตัวเลือกเสริม เช่น enabled
 * @returns React Query ของ PaginatedResponse<PurchaseOrder>
 * @example
 * const { data } = usePurchaseOrder({ page: 1, perpage: 20 });
 */
export function usePurchaseOrder(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<PurchaseOrder>>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.PURCHASE_ORDER(buCode!), params);
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch purchase orders");
      return res.json();
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook ดึงรายการ PO ที่รอให้ผู้ใช้ปัจจุบันดำเนินการใน workflow
 * Unwrap section แรกจาก response เป็น paginated แบบมาตรฐาน
 * @param params - พารามิเตอร์ filter/sort/pagination
 * @param options - ตัวเลือกเสริม เช่น enabled
 * @returns React Query ของ PaginatedResponse<PurchaseOrder>
 * @example
 * const { data } = useMyPendingPurchaseOrder();
 */
export function useMyPendingPurchaseOrder(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<PurchaseOrder>>({
    queryKey: [QUERY_KEYS.MY_PENDING_PURCHASE_ORDERS, buCode, params],
    queryFn: async () => {
      if (!buCode)
        throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing buCode");
      const url = buildUrl(API_ENDPOINTS.MY_PENDING_PURCHASE_ORDERS, {
        bu_code: buCode,
        ...params,
      });
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(
          res,
          "Failed to fetch my pending purchase orders",
        );
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
 * Hook ดึงรายการ vendor ที่มี PO พร้อมรับเข้า (สำหรับสร้าง GRN)
 * ใช้ CACHE_DYNAMIC และจะไม่ fetch จนกว่า buCode จะพร้อม
 * @returns React Query ของรายการ VendorForGrn
 * @example
 * const { data: vendors } = usePurchaseOrderGrnVendors();
 */
export function usePurchaseOrderGrnVendors() {
  const buCode = useBuCode();

  return useQuery<VendorForGrn[]>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS_GRN_VENDORS, buCode],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PURCHASE_ORDER_GRN_VENDORS(buCode!),
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch vendors for GRN");
      const json = await res.json();
      return json.data ?? json;
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงรายการ PO ที่พร้อมสร้าง GRN
 * ใช้ CACHE_DYNAMIC จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์ filter/sort/pagination
 * @param options - ตัวเลือกเสริม เช่น enabled (ใช้ defer fetch แบบ lazy)
 * @returns React Query ของ PaginatedResponse<PoForGrn>
 * @example
 * const { data } = usePurchaseOrderForGrn({ search: "PO-2025" });
 */
export function usePurchaseOrderForGrn(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<PoForGrn>>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS_GRN, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.PURCHASE_ORDER_GRN(buCode!), params);
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(
          res,
          "Failed to fetch purchase orders for GRN",
        );
      return res.json();
    },
    enabled: !!buCode && (options?.enabled ?? true),
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงรายการ PO ที่พร้อมสร้าง GRN ของ vendor ที่กำหนด
 * ใช้ใน dialog เลือก PO สำหรับสร้าง GRN จะไม่ fetch จนกว่า buCode และ vendorId จะพร้อม
 * @param vendorId - รหัส vendor
 * @returns React Query ของ PaginatedResponse<PoForGrn>
 * @example
 * const { data } = usePurchaseOrderForGrnByVendor(vendorId);
 */
export function usePurchaseOrderForGrnByVendor(vendorId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<PoForGrn>>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS_GRN, buCode, "vendor", vendorId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PURCHASE_ORDER_GRN_VENDOR(buCode!, vendorId!),
      );
      if (!res.ok)
        throw ApiError.fromResponse(
          res,
          "Failed to fetch purchase orders for GRN",
        );
      return res.json();
    },
    enabled: !!buCode && !!vendorId,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงข้อมูล PO ตาม id แบบเดี่ยว
 * Unwrap data จาก response จะไม่ fetch จนกว่า buCode และ id จะพร้อม
 * @param id - รหัส PO
 * @returns React Query ของ PurchaseOrder
 * @example
 * const { data: po } = usePurchaseOrderById(params.id);
 */
export function usePurchaseOrderById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<PurchaseOrder>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDERS, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.PURCHASE_ORDER(buCode!)}/${id}`,
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch purchase order");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && !!id,
  });
}

const PO_INVALIDATE_KEYS = [
  QUERY_KEYS.PURCHASE_ORDERS,
  QUERY_KEYS.MY_PENDING_PURCHASE_ORDERS,
];

/**
 * Hook สร้าง PO ใหม่ผ่าน POST
 * Invalidate PURCHASE_ORDERS และ MY_PENDING_PURCHASE_ORDERS เมื่อสำเร็จ
 * @returns Mutation สำหรับสร้าง PO
 * @example
 * const create = useCreatePurchaseOrder();
 * create.mutate(payload);
 */
export function useCreatePurchaseOrder() {
  return useApiMutation<CreatePoDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PURCHASE_ORDER(buCode), data),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to create purchase order",
  });
}

/**
 * Hook บันทึก (save) การแก้ไข PO ผ่าน PATCH /{id}/save
 * ใช้สำหรับแก้ไข draft และ invalidate cache ที่เกี่ยวข้อง
 * @returns Mutation สำหรับบันทึก PO
 * @example
 * const update = useUpdatePurchaseOrder();
 * update.mutate({ id, ...values });
 */
export function useUpdatePurchaseOrder() {
  return useApiMutation<CreatePoDto & { id: string }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}/save`,
        data,
      ),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to update purchase order",
  });
}

/**
 * Hook ลบ PO พร้อม optimistic update
 * ลบ item ออกจาก list cache ทันทีและ rollback หาก API ล้มเหลว
 * @returns Mutation สำหรับลบ PO
 * @example
 * const del = useDeletePurchaseOrder();
 * del.mutate(poId);
 */
export function useDeletePurchaseOrder() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}`),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to delete purchase order",
    optimisticList: {
      queryKeyPrefix: [QUERY_KEYS.PURCHASE_ORDERS],
      updater: removeFromListById,
    },
  });
}

/**
 * Hook ส่ง (submit) PO เพื่อเข้าสู่ workflow อนุมัติ
 * ส่ง PATCH /{id}/submit พร้อม stage_role และ details ของรายการที่ผ่าน
 * @returns Mutation สำหรับ submit PO
 * @example
 * const submit = useSubmitPurchaseOrder();
 * submit.mutate({ id, stage_role, details });
 */
export function useSubmitPurchaseOrder() {
  return useApiMutation<{
    id: string;
    stage_role: string;
    doc_version: number;
    details: { id: string; stage_status: string; stage_message: string | null }[];
  }>({
    mutationFn: ({ id, ...body }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}/submit`,
        body,
      ),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to submit purchase order",
  });
}

/**
 * Hook อนุมัติ (approve) PO ในขั้นตอน workflow ปัจจุบัน
 * ส่ง PATCH /{id}/approve พร้อม stage_role และ details
 * @returns Mutation สำหรับอนุมัติ PO
 * @example
 * const approve = useApprovePurchaseOrder();
 * approve.mutate({ id, stage_role, details });
 */
export function useApprovePurchaseOrder() {
  return useApiMutation<{
    id: string;
    stage_role: string;
    doc_version: number;
    details: { id: string; stage_status: string; stage_message: string | null }[];
  }>({
    mutationFn: ({ id, ...body }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}/approve`,
        body,
      ),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to approve purchase order",
  });
}

/**
 * Hook ปฏิเสธ (reject) PO ในขั้นตอน workflow ปัจจุบัน
 * ส่ง PATCH /{id}/reject พร้อม stage_role, details และ stage_message
 * @returns Mutation สำหรับปฏิเสธ PO
 * @example
 * const reject = useRejectPurchaseOrder();
 * reject.mutate({ id, stage_role, details });
 */
export function useRejectPurchaseOrder() {
  return useApiMutation<{
    id: string;
    stage_role: string;
    doc_version: number;
    details: { id: string; stage_status: string; stage_message: string | null }[];
  }>({
    mutationFn: ({ id, ...body }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}/reject`,
        body,
      ),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to reject purchase order",
  });
}

export interface PoPreviousStage {
  key: string;
  name: string;
}

/**
 * Hook ดึงรายการขั้นตอน workflow ก่อนหน้าของ PO (สำหรับ send-back)
 * API คืน object map แล้ว transform เป็น array ของ { key, name }
 * @param poId - รหัส PO
 * @returns React Query ของรายการ PoPreviousStage[]
 * @example
 * const { data: stages } = usePoPreviousStages(poId);
 */
export function usePoPreviousStages(poId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<PoPreviousStage[]>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDER_PREVIOUS_STAGES, buCode, poId],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.PURCHASE_ORDER(buCode!)}/${poId}/previous-stages`,
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch previous stages");
      const json = await res.json();
      const data = json.data ?? {};
      // API returns { "1": "Create Request", "2": "..." } → transform to array
      return Object.entries(data).map(([key, label]) => ({
        name: label as string,
        key,
      }));
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && !!poId,
  });
}

/**
 * Hook ส่งกลับ (review/send-back) PO ไปยัง stage ก่อนหน้า
 * ส่ง PATCH /{id}/review พร้อม des_stage ปลายทาง
 * @returns Mutation สำหรับ review PO
 * @example
 * const review = useReviewPurchaseOrder();
 * review.mutate({ id, stage_role, des_stage: "1", details });
 */
export function useReviewPurchaseOrder() {
  return useApiMutation<{
    id: string;
    stage_role: string;
    doc_version: number;
    des_stage?: string;
    details: { id: string; stage_status: string; stage_message: string | null }[];
  }>({
    mutationFn: ({ id, ...body }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}/review`,
        body,
      ),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to review purchase order",
  });
}

/**
 * Hook ยกเลิก (cancel) PO ตาม id
 * POST /{id}/cancel และ invalidate cache PO
 * @returns Mutation สำหรับยกเลิก PO
 * @example
 * const cancel = useCancelPurchaseOrder();
 * cancel.mutate(poId);
 */
export function useCancelPurchaseOrder() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.post(`${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}/cancel`),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to cancel purchase order",
  });
}

/**
 * Hook ปิด (close) PO ตาม id
 * POST /{id}/close เมื่อ GRN ครบและต้องการปิดเอกสาร
 * @returns Mutation สำหรับปิด PO
 * @example
 * const close = useClosePurchaseOrder();
 * close.mutate(poId);
 */
export function useClosePurchaseOrder() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.post(`${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}/close`),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to close purchase order",
  });
}

// --- Comments ---

const poCommentCrud = createCommentCrud({
  queryKey: QUERY_KEYS.PURCHASE_ORDER_COMMENTS,
  entityEndpoint: API_ENDPOINTS.PURCHASE_ORDER,
  commentEndpoint: API_ENDPOINTS.PURCHASE_ORDER_COMMENT,
  attachmentEndpoint: API_ENDPOINTS.PURCHASE_ORDER_COMMENT_ATTACHMENT,
  idFieldName: "purchase_order_id",
  label: "purchase order",
});

/**
 * ดึงความคิดเห็นของ PO จาก
 * `/api/{buCode}/purchase-order-comment/{poId}`
 */
export function usePurchaseOrderComments(poId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<CommentItem[]>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDER_COMMENTS, buCode, poId],
    queryFn: async () => {
      if (!buCode || !poId)
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          "Missing buCode or purchase order id",
        );
      const res = await httpClient.get(
        API_ENDPOINTS.PURCHASE_ORDER_COMMENT(buCode, poId),
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch comments");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!poId,
  });
}

/** แก้ไขความคิดเห็นใน PO */
export const useUpdatePurchaseOrderComment = poCommentCrud.useUpdate;
/** ลบความคิดเห็นใน PO */
export const useDeletePurchaseOrderComment = poCommentCrud.useDelete;

/**
 * สร้างความคิดเห็นใน PO ผ่าน multipart/form-data
 * ส่ง message + type + files ในคำขอเดียวไปยัง
 * `/api/{buCode}/purchase-order-comment/{poId}`
 */
export function useCreatePurchaseOrderComment() {
  return useApiMutation<{
    purchase_order_id: string;
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
        API_ENDPOINTS.PURCHASE_ORDER_COMMENT(buCode, data.purchase_order_id),
        formData,
      );
    },
    invalidateKeys: [QUERY_KEYS.PURCHASE_ORDER_COMMENTS],
    errorMessage: "Failed to add comment",
  });
}

// --- Export ---

interface ExportPurchaseOrderArgs {
  params?: ParamsDto;
  viewMode: "my-pending" | "all-document";
  columns: XlsxColumn<PurchaseOrder>[];
}

/**
 * Hook ส่งออก PO เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list (เลือกตาม viewMode) — caller กำหนด columns พร้อม translation
 * @returns { exportPurchaseOrder, isExporting }
 */
export function useExportPurchaseOrder() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportPurchaseOrder = async ({
    params,
    viewMode,
    columns,
  }: ExportPurchaseOrderArgs) => {
    if (!buCode)
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing buCode");
    return exportToXlsx<PurchaseOrder>({
      fetch: async () => {
        if (viewMode === "my-pending") {
          const url = buildUrl(API_ENDPOINTS.MY_PENDING_PURCHASE_ORDERS, {
            bu_code: buCode,
            ...params,
          });
          const res = await httpClient.get(url);
          if (!res.ok)
            throw ApiError.fromResponse(res, "Failed to fetch purchase orders");
          const json = await res.json();
          return json.data?.[0]?.data ?? [];
        }
        const url = buildUrl(API_ENDPOINTS.PURCHASE_ORDER(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok)
          throw ApiError.fromResponse(res, "Failed to fetch purchase orders");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Purchase Orders",
      fileNamePrefix: "purchase-order",
    });
  };

  return { exportPurchaseOrder, isExporting };
}
