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
  PurchaseOrder,
  CreatePoDto,
  PoForGrn,
  VendorForGrn,
} from "@/types/purchase-order";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { CACHE_DYNAMIC, CACHE_STATIC } from "@/lib/cache-config";

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
        throw await ApiError.from(res, "Failed to fetch purchase orders");
      const json = await res.json();
      // envelope ซ้อน multi-BU: แถวจริงอยู่ที่ `data[0].data` พร้อม paginate ของ
      // BU นั้น (ท่าเดียวกับ PR/SR และ my-pending ข้างล่าง)
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
 * Hook ดึงรายชื่อ workflow stages ของ PO ใน business unit ปัจจุบัน
 * ใช้สำหรับแสดง stage filter และจะไม่ fetch จนกว่า buCode จะพร้อม
 * @returns React Query ของ string[] (รายชื่อ stage)
 * @example
 * const { data: stages = [] } = usePurchaseOrderWorkflowStages();
 */
export function usePurchaseOrderWorkflowStages() {
  const buCode = useBuCode();

  return useQuery<string[]>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDER_WORKFLOW_STAGES, buCode],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.PURCHASE_ORDER_WORKFLOW_STAGES(buCode!),
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
        throw await ApiError.from(
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
        throw await ApiError.from(res, "Failed to fetch vendors for GRN");
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
        throw await ApiError.from(
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
        throw await ApiError.from(
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
        throw await ApiError.from(res, "Failed to fetch purchase order");
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

export function useCreatePurchaseOrder() {
  return useApiMutation<CreatePoDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PURCHASE_ORDER(buCode), data),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to create purchase order",
  });
}

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

export function useSubmitPurchaseOrder() {
  return useApiMutation<{
    id: string;
    stage_role: string;
    doc_version: number;
    details: {
      id: string;
      stage_status: string;
      stage_message: string | null;
    }[];
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

export function useApprovePurchaseOrder() {
  return useApiMutation<{
    id: string;
    stage_role: string;
    doc_version: number;
    details: {
      id: string;
      stage_status: string;
      stage_message: string | null;
    }[];
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

export function useRejectPurchaseOrder() {
  return useApiMutation<{
    id: string;
    stage_role: string;
    doc_version: number;
    details: {
      id: string;
      stage_status: string;
      stage_message: string | null;
    }[];
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

export function usePoPreviousStages(poId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<PoPreviousStage[]>({
    queryKey: [QUERY_KEYS.PURCHASE_ORDER_PREVIOUS_STAGES, buCode, poId],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.PURCHASE_ORDER(buCode!)}/${poId}/previous-stages`,
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch previous stages");
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

export function useReviewPurchaseOrder() {
  return useApiMutation<{
    id: string;
    stage_role: string;
    doc_version: number;
    des_stage?: string;
    details: {
      id: string;
      stage_status: string;
      stage_message: string | null;
    }[];
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

export function useCancelPurchaseOrder() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.post(`${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}/cancel`),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to cancel purchase order",
  });
}

export function useClosePurchaseOrder() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.post(`${API_ENDPOINTS.PURCHASE_ORDER(buCode)}/${id}/close`),
    invalidateKeys: PO_INVALIDATE_KEYS,
    errorMessage: "Failed to close purchase order",
  });
}

// --- Comments ---

export const poCommentCrud = createCommentCrud({
  queryKey: QUERY_KEYS.PURCHASE_ORDER_COMMENTS,
  commentEndpoint: API_ENDPOINTS.PURCHASE_ORDER_COMMENT,
  idFieldName: "purchase_order_id",
  label: "purchase order",
});

export const usePurchaseOrderComments = poCommentCrud.useComments;
export const useCreatePurchaseOrderComment = poCommentCrud.useCreate;

export const useUpdatePurchaseOrderComment = poCommentCrud.useUpdate;
export const useDeletePurchaseOrderComment = poCommentCrud.useDelete;

// --- Export ---

interface ExportPurchaseOrderArgs {
  params?: ParamsDto;
  viewMode: "my-pending" | "all-document";
  columns: XlsxColumn<PurchaseOrder>[];
}

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
            throw await ApiError.from(res, "Failed to fetch purchase orders");
          const json = await res.json();
          return json.data?.[0]?.data ?? [];
        }
        const url = buildUrl(API_ENDPOINTS.PURCHASE_ORDER(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok)
          throw await ApiError.from(res, "Failed to fetch purchase orders");
        const json = await res.json();
        return json.data?.[0]?.data ?? [];
      },
      columns,
      sheetName: "Purchase Orders",
      fileNamePrefix: "purchase-order",
    });
  };

  return { exportPurchaseOrder, isExporting };
}
