import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type {
  PhysicalCount,
  PhysicalCountData,
  CreatePhysicalCountDto,
  PhysicalCountSaveDto,
} from "@/types/physical-count";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import type { CommentItem } from "@/components/ui/comment-sheet";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/**
 * Hook ดึงรายการเอกสารตรวจนับสต็อก (paginated)
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เพราะสถานะ physical count เปลี่ยนบ่อย
 * จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์ filter/sort/pagination
 * @returns React Query ของรายการตรวจนับสต็อก
 * @example
 * const { data } = usePhysicalCount({ page: 1, filter: "doc_status:draft" });
 */
export function usePhysicalCount(params?: ParamsDto) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<PhysicalCount>>({
    queryKey: [QUERY_KEYS.PHYSICAL_COUNTS, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.PHYSICAL_COUNT(buCode!), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch physical counts");
      return res.json();
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงข้อมูลเอกสารตรวจนับสต็อกตาม id
 * Unwrap data จาก response และจะไม่ fetch จนกว่า buCode และ id จะพร้อม
 * @param id - รหัสเอกสาร
 * @returns React Query ของข้อมูล PhysicalCountData
 * @example
 * const { data: pc } = usePhysicalCountById(params.id);
 */
export function usePhysicalCountById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<PhysicalCountData>({
    queryKey: [QUERY_KEYS.PHYSICAL_COUNTS, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.PHYSICAL_COUNT(buCode!)}/${id}`,
      );
      if (!res.ok) throw new Error("Failed to fetch physical count");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}

/**
 * Hook สร้างเอกสารตรวจนับสต็อกใหม่
 * POST ข้อมูลและ invalidate รายการ physical count
 * @returns Mutation สำหรับสร้างเอกสาร
 * @example
 * const create = useCreatePhysicalCount();
 * create.mutate(payload);
 */
export function useCreatePhysicalCount() {
  return useApiMutation<CreatePhysicalCountDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.PHYSICAL_COUNT(buCode), data),
    invalidateKeys: [QUERY_KEYS.PHYSICAL_COUNTS, QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT],
    errorMessage: "Failed to create physical count",
  });
}

/**
 * Hook แก้ไขเอกสารตรวจนับสต็อก
 * ส่ง PUT โดยระบุ id และ invalidate รายการ physical count
 * @returns Mutation สำหรับแก้ไขเอกสาร
 * @example
 * const update = useUpdatePhysicalCount();
 * update.mutate({ id, ...values });
 */
export function useUpdatePhysicalCount() {
  return useApiMutation<CreatePhysicalCountDto & { id: string }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.put(
        `${API_ENDPOINTS.PHYSICAL_COUNT(buCode)}/${id}`,
        data,
      ),
    invalidateKeys: [QUERY_KEYS.PHYSICAL_COUNTS, QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT],
    errorMessage: "Failed to update physical count",
  });
}

/**
 * Hook ลบเอกสารตรวจนับสต็อกตาม id
 * ส่ง DELETE และ invalidate รายการ physical count
 * @returns Mutation สำหรับลบเอกสาร
 * @example
 * const del = useDeletePhysicalCount();
 * del.mutate(id);
 */
export function useDeletePhysicalCount() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.PHYSICAL_COUNT(buCode)}/${id}`),
    invalidateKeys: [QUERY_KEYS.PHYSICAL_COUNTS, QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT],
    errorMessage: "Failed to delete physical count",
  });
}

/**
 * Hook บันทึกรายการตรวจนับในเอกสารตรวจนับ (save partial)
 * ส่ง PATCH ไปยัง endpoint save ของเอกสารนั้น ใช้สำหรับบันทึกรายการทีละส่วน
 * @param physicalCountId - รหัสเอกสารตรวจนับ
 * @returns Mutation สำหรับบันทึกข้อมูล
 * @example
 * const save = useSavePhysicalCount(id);
 * save.mutate({ items });
 */
export function useSavePhysicalCount(physicalCountId: string) {
  return useApiMutation<PhysicalCountSaveDto>({
    mutationFn: (data, buCode) =>
      httpClient.patch(
        API_ENDPOINTS.PHYSICAL_COUNT_SAVE(buCode, physicalCountId),
        data,
      ),
    invalidateKeys: [QUERY_KEYS.PHYSICAL_COUNTS, QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT],
    errorMessage: "Failed to save physical count",
  });
}

/**
 * Hook ดึงข้อมูล review ของ Physical Count
 * GET ไปยัง /api/{buCode}/physical-count/:id/review
 *
 * @param id - รหัสเอกสารตรวจนับ
 */
export function usePhysicalCountReview(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<PhysicalCountData>({
    queryKey: [QUERY_KEYS.PHYSICAL_COUNTS, buCode, id, "review"],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PHYSICAL_COUNT_REVIEW(buCode!, id!),
      );
      if (!res.ok) throw new Error("Failed to fetch physical count review");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}

/**
 * Hook submit Physical Count (final approval) — workflow transition
 * PATCH ไปยัง /api/{buCode}/physical-count/:id/submit (ไม่มี body)
 *
 * @param physicalCountId - รหัสเอกสารตรวจนับ
 */
export function useSubmitPhysicalCount(physicalCountId: string) {
  return useApiMutation<Record<string, never>>({
    mutationFn: (_data, buCode) =>
      httpClient.patch(
        API_ENDPOINTS.PHYSICAL_COUNT_SUBMIT(buCode, physicalCountId),
        {},
      ),
    invalidateKeys: [QUERY_KEYS.PHYSICAL_COUNTS, QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT],
    errorMessage: "Failed to submit physical count",
  });
}

/**
 * Hook ส่ง Physical Count ขึ้นรอบ review (workflow transition)
 * PATCH ไปยัง /api/{buCode}/physical-count/:id/review พร้อม items payload
 *
 * @param physicalCountId - รหัสเอกสารตรวจนับ
 */
export function useReviewPhysicalCount(physicalCountId: string) {
  return useApiMutation<PhysicalCountSaveDto>({
    mutationFn: (data, buCode) =>
      httpClient.patch(
        API_ENDPOINTS.PHYSICAL_COUNT_REVIEW(buCode, physicalCountId),
        data,
      ),
    invalidateKeys: [QUERY_KEYS.PHYSICAL_COUNTS, QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT],
    errorMessage: "Failed to submit for review",
  });
}

/**
 * Hook ดึงรายการ comment ของ Physical Count detail จาก
 * `/api/{buCode}/physical-count-detail-comment/{detailId}`
 */
export function usePhysicalCountDetailComments(detailId: string | undefined) {
  const buCode = useBuCode();

  return useQuery<CommentItem[]>({
    queryKey: [
      QUERY_KEYS.PHYSICAL_COUNT_DETAIL_COMMENTS,
      buCode,
      detailId,
    ],
    queryFn: async () => {
      if (!buCode || !detailId)
        throw new Error("Missing buCode or physical count detail id");
      const res = await httpClient.get(
        API_ENDPOINTS.PHYSICAL_COUNT_DETAIL_COMMENT(buCode, detailId),
      );
      if (!res.ok) throw new Error("Failed to fetch comments");
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode && !!detailId,
  });
}

/**
 * Hook บันทึก comment + files ของ Physical Count detail
 * ใช้ multipart pattern เดียวกับ comment ของ PR/PO/CN/GRN/SR:
 * POST /api/{buCode}/physical-count-detail-comment/{detailId}
 * fields: message, type (เช่น "user"), files[]
 *
 * @param detailId - รหัส physical count detail
 * @returns Mutation รับ { message, type, files }
 */
export function useSavePhysicalCountProductNote(detailId: string) {
  const buCode = useBuCode();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      message: string;
      type: string;
      files: File[];
    }) => {
      if (!buCode) throw new Error("Missing business unit code");
      const formData = new FormData();
      formData.append("message", payload.message);
      formData.append("type", payload.type);
      for (const file of payload.files) {
        formData.append("files", file, file.name);
      }
      const res = await httpClient.post(
        API_ENDPOINTS.PHYSICAL_COUNT_DETAIL_COMMENT(buCode, detailId),
        formData,
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to save product note");
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.PHYSICAL_COUNT_DETAIL_COMMENTS, buCode, detailId],
      });
    },
  });
}

/**
 * Hook รีเฟรชข้อมูลสินค้าในเอกสารตรวจนับสต็อกให้เป็นปัจจุบัน
 * ส่ง PATCH ไปยัง endpoint refresh เพื่อ sync stock ปัจจุบันเข้าเอกสาร
 * @param physicalCountId - รหัสเอกสารตรวจนับ
 * @returns Mutation สำหรับรีเฟรชข้อมูล
 * @example
 * const refresh = useRefreshPhysicalCount(id);
 * refresh.mutate({});
 */
export function useRefreshPhysicalCount(physicalCountId: string) {
  return useApiMutation<Record<string, never>>({
    mutationFn: (_data, buCode) =>
      httpClient.patch(
        API_ENDPOINTS.PHYSICAL_COUNT_REFRESH(buCode, physicalCountId),
        {},
      ),
    invalidateKeys: [QUERY_KEYS.PHYSICAL_COUNTS, QUERY_KEYS.PHYSICAL_COUNT_PERIOD_CURRENT],
    errorMessage: "Failed to refresh physical count",
  });
}
