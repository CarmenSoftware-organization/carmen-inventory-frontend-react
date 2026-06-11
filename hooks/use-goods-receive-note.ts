import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation, removeFromListById } from "@/hooks/use-api-mutation";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type {
  GoodsReceiveNote,
  CreateGrnDto,
  GrnProductItem,
  GrnLocationItem,
} from "@/types/goods-receive-note";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import type {
  CommentAttachment,
  CommentItem,
} from "@/components/ui/comment-sheet";
import { CACHE_DYNAMIC, CACHE_NORMAL } from "@/lib/cache-config";

/**
 * Hook ดึงรายการ Goods Receive Note ตาม business unit ปัจจุบัน
 * รองรับ filter/pagination/search ผ่าน ParamsDto และใช้ CACHE_DYNAMIC
 * (staleTime 1 นาที) เพราะสถานะ GRN เปลี่ยนบ่อย จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์สำหรับ filter/pagination
 * @param options - ตัวเลือก enabled สำหรับเปิด/ปิด query
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ GoodsReceiveNote
 * @example
 * const { data, isLoading } = useGoodsReceiveNote({ page: 1, perpage: 20 });
 */
export function useGoodsReceiveNote(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<GoodsReceiveNote>>({
    queryKey: [QUERY_KEYS.GOODS_RECEIVE_NOTES, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.GOODS_RECEIVE_NOTE(buCode!), params);
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch goods receive notes");
      return res.json();
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook ดึงรายการ GRN เฉพาะของ vendor ที่ระบุ
 * ใช้ cache dynamic และจะไม่ fetch จนกว่าจะมี buCode และ vendorId พร้อม
 * @param vendorId - id ของ vendor
 * @param params - พารามิเตอร์สำหรับ filter/pagination
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ GoodsReceiveNote
 * @example
 * const { data } = useGoodsReceiveNoteByVendor(vendorId, { page: 1 });
 */
export function useGoodsReceiveNoteByVendor(
  vendorId: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<GoodsReceiveNote>>({
    queryKey: [
      QUERY_KEYS.GOODS_RECEIVE_NOTES_BY_VENDOR,
      buCode,
      vendorId,
      params,
    ],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.GOODS_RECEIVE_NOTE_BY_VENDOR(buCode!, vendorId!),
        params,
      );
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(
          res,
          "Failed to fetch goods receive notes by vendor",
        );
      return res.json();
    },
    enabled: !!buCode && !!vendorId,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงรายการ GRN ของ vendor ที่สามารถออก Credit Note ได้
 * เรียก endpoint `/good-received-note/vendor/:vendor_id/cn` (filter เฉพาะ GRN ที่ commit/saved และยังไม่ credit เต็มจำนวน)
 * ใช้ cache dynamic และจะไม่ fetch จนกว่าจะมี buCode และ vendorId พร้อม
 * @param vendorId - id ของ vendor
 * @param params - พารามิเตอร์สำหรับ filter/pagination
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ GoodsReceiveNote
 * @example
 * const { data } = useGoodsReceiveNoteByVendorForCn(vendorId, { page: 1 });
 */
export function useGoodsReceiveNoteByVendorForCn(
  vendorId: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<GoodsReceiveNote>>({
    queryKey: [
      QUERY_KEYS.GOODS_RECEIVE_NOTES_BY_VENDOR_FOR_CN,
      buCode,
      vendorId,
      params,
    ],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.GOODS_RECEIVE_NOTE_BY_VENDOR_FOR_CN(buCode!, vendorId!),
        params,
      );
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(
          res,
          "Failed to fetch goods receive notes by vendor for CN",
        );
      return res.json();
    },
    enabled: !!buCode && !!vendorId,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงรายการ product ที่อยู่ในรายละเอียดของ GRN ที่ระบุ
 * ใช้สำหรับ lookup สินค้าในฟอร์ม CN/PR/RP (คืนเฉพาะ product ที่ถูกรับเข้าแล้ว)
 * ใช้ CACHE_NORMAL และจะไม่ fetch จนกว่า buCode และ grnId จะพร้อม
 * @param grnId - id ของ GRN
 * @param params - พารามิเตอร์ pagination/search
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ Product
 * @example
 * const { data } = useGrnProducts(grnId, { search });
 */
export function useGrnProducts(
  grnId: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<GrnProductItem>>({
    queryKey: [QUERY_KEYS.GOODS_RECEIVE_NOTE_PRODUCTS, buCode, grnId, params],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.GOODS_RECEIVE_NOTE_PRODUCTS(buCode!, grnId!),
        params,
      );
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch GRN products");
      return res.json();
    },
    enabled: !!buCode && !!grnId,
    ...CACHE_NORMAL,
  });
}

/**
 * Hook ดึงรายการ location ของ product ที่อยู่ใน GRN ที่ระบุ
 * cascading: grnId → productId → locations ที่รับเข้าของ product นั้น
 * ใช้ CACHE_NORMAL และจะไม่ fetch จนกว่าทุก param จะพร้อม
 * @param grnId - id ของ GRN
 * @param productId - id ของ product
 * @param params - พารามิเตอร์ pagination/search
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ Location
 * @example
 * const { data } = useGrnProductLocations(grnId, productId);
 */
export function useGrnProductLocations(
  grnId: string | undefined,
  productId: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<GrnLocationItem>>({
    queryKey: [
      QUERY_KEYS.GOODS_RECEIVE_NOTE_PRODUCT_LOCATIONS,
      buCode,
      grnId,
      productId,
      params,
    ],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.GOODS_RECEIVE_NOTE_PRODUCT_LOCATIONS(
          buCode!,
          grnId!,
          productId!,
        ),
        params,
      );
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(
          res,
          "Failed to fetch GRN product locations",
        );
      return res.json();
    },
    enabled: !!buCode && !!grnId && !!productId,
    ...CACHE_NORMAL,
  });
}

/**
 * Hook ดึงรายการ location ที่อยู่ในรายละเอียดของ GRN ที่ระบุ
 * ใช้สำหรับ lookup คลังในฟอร์ม CN/PR/RP (คืนเฉพาะ location ที่รับเข้าแล้ว)
 * ใช้ CACHE_NORMAL และจะไม่ fetch จนกว่า buCode และ grnId จะพร้อม
 * @param grnId - id ของ GRN
 * @param params - พารามิเตอร์ pagination/search
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ Location
 * @example
 * const { data } = useGrnLocations(grnId, { search });
 */
export function useGrnLocations(
  grnId: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<GrnLocationItem>>({
    queryKey: [QUERY_KEYS.GOODS_RECEIVE_NOTE_LOCATIONS, buCode, grnId, params],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.GOODS_RECEIVE_NOTE_LOCATIONS(buCode!, grnId!),
        params,
      );
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch GRN locations");
      return res.json();
    },
    enabled: !!buCode && !!grnId,
    ...CACHE_NORMAL,
  });
}

/**
 * Hook ดึงรายการ product ของ location ที่อยู่ใน GRN ที่ระบุ
 * cascading: grnId → locationId → products ที่รับเข้าของ location นั้น
 * ใช้ CACHE_NORMAL และจะไม่ fetch จนกว่าทุก param จะพร้อม
 * @param grnId - id ของ GRN
 * @param locationId - id ของ location
 * @param params - พารามิเตอร์ pagination/search
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ Product
 * @example
 * const { data } = useGrnLocationProducts(grnId, locationId);
 */
export function useGrnLocationProducts(
  grnId: string | undefined,
  locationId: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<GrnProductItem>>({
    queryKey: [
      QUERY_KEYS.GOODS_RECEIVE_NOTE_LOCATION_PRODUCTS,
      buCode,
      grnId,
      locationId,
      params,
    ],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.GOODS_RECEIVE_NOTE_LOCATION_PRODUCTS(
          buCode!,
          grnId!,
          locationId!,
        ),
        params,
      );
      const res = await httpClient.get(url);
      if (!res.ok)
        throw ApiError.fromResponse(
          res,
          "Failed to fetch GRN location products",
        );
      return res.json();
    },
    enabled: !!buCode && !!grnId && !!locationId,
    ...CACHE_NORMAL,
  });
}

/**
 * Hook ดึงข้อมูล GRN ตาม id แบบเดี่ยว
 * Unwrap data จาก response และจะไม่ fetch จนกว่า buCode และ id จะพร้อม
 * @param id - id ของ GRN
 * @returns ผลลัพธ์ useQuery ของ GoodsReceiveNote
 * @example
 * const { data: grn } = useGoodsReceiveNoteById(params.id);
 */
export function useGoodsReceiveNoteById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<GoodsReceiveNote>({
    queryKey: [QUERY_KEYS.GOODS_RECEIVE_NOTES, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.GOODS_RECEIVE_NOTE(buCode!)}/${id}`,
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch goods receive note");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && !!id,
  });
}

/**
 * Hook สำหรับสร้าง GRN ใหม่ผ่าน POST API
 * ทำการ invalidate GOODS_RECEIVE_NOTES cache เมื่อสำเร็จ
 * @returns mutation object จาก useApiMutation
 * @example
 * const createGrn = useCreateGoodsReceiveNote();
 * createGrn.mutate(payload);
 */
export function useCreateGoodsReceiveNote() {
  return useApiMutation<CreateGrnDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.GOODS_RECEIVE_NOTE(buCode), data),
    invalidateKeys: [QUERY_KEYS.GOODS_RECEIVE_NOTES],
    errorMessage: "Failed to create goods receive note",
  });
}

/**
 * Hook สำหรับแก้ไข GRN ผ่าน PATCH API โดยระบุ id
 * Invalidate cache รายการ GRN เมื่อสำเร็จ
 * @returns mutation object จาก useApiMutation
 * @example
 * const updateGrn = useUpdateGoodsReceiveNote();
 * updateGrn.mutate({ id, ...values });
 */
export function useUpdateGoodsReceiveNote() {
  return useApiMutation<CreateGrnDto & { id: string }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.patch(`${API_ENDPOINTS.GOODS_RECEIVE_NOTE(buCode)}/${id}`, data),
    invalidateKeys: [QUERY_KEYS.GOODS_RECEIVE_NOTES],
    errorMessage: "Failed to update goods receive note",
  });
}

/**
 * Hook สำหรับลบ GRN พร้อม optimistic update
 * ลบ item ออกจาก list cache ทันที และ rollback หาก API ล้มเหลว
 * @returns mutation object จาก useApiMutation
 * @example
 * const del = useDeleteGoodsReceiveNote();
 * del.mutate(grnId);
 */
export function useDeleteGoodsReceiveNote() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.GOODS_RECEIVE_NOTE(buCode)}/${id}`),
    invalidateKeys: [QUERY_KEYS.GOODS_RECEIVE_NOTES],
    errorMessage: "Failed to delete goods receive note",
    optimisticList: {
      queryKeyPrefix: [QUERY_KEYS.GOODS_RECEIVE_NOTES],
      updater: removeFromListById,
    },
  });
}

/**
 * Hook สำหรับ save GRN ตาม id ผ่าน PATCH /save
 * ใช้หลัง create/update เพื่อเปลี่ยนสถานะจาก draft → saved และ invalidate cache
 * @returns mutation object จาก useApiMutation
 * @example
 * const saveGrn = useSaveGoodsReceiveNote();
 * saveGrn.mutate(grnId);
 */
export function useSaveGoodsReceiveNote() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.GOODS_RECEIVE_NOTE(buCode)}/${id}/save`,
      ),
    invalidateKeys: [QUERY_KEYS.GOODS_RECEIVE_NOTES],
    errorMessage: "Failed to save goods receive note",
  });
}

/**
 * Hook สำหรับยืนยัน (confirm) GRN ตาม id ผ่าน PATCH /confirm
 * ใช้สำหรับเปลี่ยนสถานะ GRN เป็น committed และ invalidate cache
 * @returns mutation object จาก useApiMutation
 * @example
 * const confirm = useConfirmGoodsReceiveNote();
 * confirm.mutate(grnId);
 */
export function useCommitGoodsReceiveNote() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.GOODS_RECEIVE_NOTE(buCode)}/${id}/commit`,
      ),
    invalidateKeys: [QUERY_KEYS.GOODS_RECEIVE_NOTES],
    errorMessage: "Failed to confirm goods receive note",
  });
}

/**
 * Hook สำหรับยกเลิก (void) GRN ตาม id ผ่าน DELETE /void
 * ทำ soft-delete เป็นสถานะ voided และ invalidate cache รายการ
 * @returns mutation object จาก useApiMutation
 * @example
 * const voidGrn = useVoidGoodsReceiveNote();
 * voidGrn.mutate(grnId);
 */
export function useVoidGoodsReceiveNote() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(
        `${API_ENDPOINTS.GOODS_RECEIVE_NOTE(buCode)}/${id}/void`,
      ),
    invalidateKeys: [QUERY_KEYS.GOODS_RECEIVE_NOTES],
    errorMessage: "Failed to void goods receive note",
  });
}

// --- Comments ---

/**
 * ดึงรายการ comment ของ GRN จาก
 * `/api/{buCode}/good-received-note-comment/{grnId}`
 */
export function useGoodsReceiveNoteComments(grnId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<CommentItem[]>({
    queryKey: [QUERY_KEYS.GOODS_RECEIVE_NOTE_COMMENTS, buCode, grnId],
    queryFn: async () => {
      if (!buCode || !grnId)
        throw new ApiError(
          ERROR_CODES.VALIDATION_ERROR,
          "Missing buCode or goods receive note id",
        );
      const res = await httpClient.get(
        API_ENDPOINTS.GOODS_RECEIVE_NOTE_COMMENT(buCode, grnId),
      );
      if (!res.ok)
        throw ApiError.fromResponse(res, "Failed to fetch comments");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!grnId,
  });
}

/**
 * แก้ไข comment ของ GRN ผ่าน
 * `PATCH /api/{buCode}/good-received-note-comment/{commentId}`
 */
export function useUpdateGrnComment() {
  return useApiMutation<{
    id: string;
    message: string;
    attachments: CommentAttachment[];
  }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.GOODS_RECEIVE_NOTE_COMMENT(buCode)}/${id}`,
        data,
      ),
    invalidateKeys: [QUERY_KEYS.GOODS_RECEIVE_NOTE_COMMENTS],
    errorMessage: "Failed to update comment",
  });
}

/**
 * ลบ comment ของ GRN ผ่าน
 * `DELETE /api/{buCode}/good-received-note-comment/{commentId}`
 */
export function useDeleteGrnComment() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(
        `${API_ENDPOINTS.GOODS_RECEIVE_NOTE_COMMENT(buCode)}/${id}`,
      ),
    invalidateKeys: [QUERY_KEYS.GOODS_RECEIVE_NOTE_COMMENTS],
    errorMessage: "Failed to delete comment",
  });
}

/**
 * สร้าง comment ของ GRN ผ่าน multipart/form-data
 * ส่ง message + type + files ในคำขอเดียวไปยัง
 * `/api/{buCode}/good-received-note-comment/{grnId}`
 */
export function useCreateGrnComment() {
  return useApiMutation<{
    good_received_note_id: string;
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
        API_ENDPOINTS.GOODS_RECEIVE_NOTE_COMMENT(
          buCode,
          data.good_received_note_id,
        ),
        formData,
      );
    },
    invalidateKeys: [QUERY_KEYS.GOODS_RECEIVE_NOTE_COMMENTS],
    errorMessage: "Failed to add comment",
  });
}

// --- Export ---

interface ExportGoodsReceiveNoteArgs {
  params?: ParamsDto;
  columns: XlsxColumn<GoodsReceiveNote>[];
}

/**
 * Hook ส่งออก GRN เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportGoodsReceiveNote, isExporting }
 */
export function useExportGoodsReceiveNote() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportGoodsReceiveNote = async ({
    params,
    columns,
  }: ExportGoodsReceiveNoteArgs) => {
    if (!buCode)
      throw new ApiError(ERROR_CODES.VALIDATION_ERROR, "Missing buCode");
    return exportToXlsx<GoodsReceiveNote>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.GOODS_RECEIVE_NOTE(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok)
          throw ApiError.fromResponse(res, "Failed to fetch goods receive notes");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Goods Receive Notes",
      fileNamePrefix: "goods-receive-note",
    });
  };

  return { exportGoodsReceiveNote, isExporting };
}
