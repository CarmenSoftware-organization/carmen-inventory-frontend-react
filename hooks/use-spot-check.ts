import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { createConfigCrud } from "@/hooks/use-config-crud";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  SpotCheck,
  CreateSpotCheckDto,
  SpotCheckReviewData,
  SpotCheckSaveDto,
} from "@/types/spot-check";

const crud = createConfigCrud<SpotCheck, CreateSpotCheckDto>({
  queryKey: QUERY_KEYS.SPOT_CHECKS,
  endpoint: API_ENDPOINTS.SPOT_CHECK,
  label: "spot check",
  cacheProfile: CACHE_DYNAMIC, // stock data เปลี่ยนบ่อย → staleTime 1 นาที (list + byId)
});

/**
 * Hook ดึงรายการ spot check แบบแบ่งหน้า
 *
 * รับ options เพิ่ม (เช่น `enabled`) เพื่อให้ caller lazy-load ได้
 * (ตัวอย่าง: หน้า list สลับ tab "history" ถึงค่อยยิง endpoint นี้)
 */
export function useSpotCheck(
  params?: ParamsDto,
  options?: Omit<UseQueryOptions<PaginatedResponse<SpotCheck>>, "queryKey" | "queryFn">,
) {
  return crud.useList(params, options);
}

export const useSpotCheckById = crud.useById;
export const useCreateSpotCheck = crud.useCreate;
export const useUpdateSpotCheck = crud.useUpdate;
export const useDeleteSpotCheck = crud.useDelete;

/**
 * Hook สำหรับ reset spot check ตาม id
 * POST /api/{buCode}/spot-check/{id}/reset (ไม่มี body)
 * Invalidate รายการ spot check เมื่อสำเร็จ
 *
 * @returns mutation ที่รับ id ของ spot check
 * @example
 * const reset = useResetSpotCheck();
 * reset.mutate(spotCheck.id);
 */
export function useResetSpotCheck() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.post(API_ENDPOINTS.SPOT_CHECK_RESET(buCode, id)),
    invalidateKeys: [QUERY_KEYS.SPOT_CHECKS, QUERY_KEYS.SPOT_CHECK_CURRENT],
    errorMessage: "Failed to reset spot check",
  });
}

/**
 * Hook บันทึก draft จำนวนนับของ Spot Check
 * PATCH /api/{buCode}/spot-check/{id}/save พร้อม { items: [{ id, actual_qty }] }
 * Invalidate รายการ spot check เมื่อสำเร็จ
 *
 * @param spotCheckId - id ของ spot check
 * @returns mutation ที่รับ payload `{ items }`
 * @example
 * const save = useSaveSpotCheck(spotCheckId);
 * save.mutate({ items: [{ id, actual_qty: 5 }] });
 */
export function useSaveSpotCheck(spotCheckId: string) {
  return useApiMutation<SpotCheckSaveDto>({
    mutationFn: (data, buCode) =>
      httpClient.patch(
        API_ENDPOINTS.SPOT_CHECK_SAVE(buCode, spotCheckId),
        data,
      ),
    invalidateKeys: [QUERY_KEYS.SPOT_CHECKS, QUERY_KEYS.SPOT_CHECK_CURRENT],
    errorMessage: "Failed to save spot check",
  });
}

/**
 * Hook ส่งจำนวนนับเพื่อ review (ปิดรอบให้ผู้ตรวจสอบ)
 * PATCH /api/{buCode}/spot-check/{id}/review พร้อม { items: [{ id, actual_qty }] }
 * Payload เหมือน save แต่ semantics = ส่งให้ตรวจสอบ → status เปลี่ยน
 * Invalidate รายการ spot check เมื่อสำเร็จ
 *
 * @param spotCheckId - id ของ spot check
 * @returns mutation ที่รับ payload `{ items }`
 * @example
 * const review = useReviewSpotCheck(spotCheckId);
 * review.mutate({ items: [{ id, actual_qty: 5 }] });
 */
export function useReviewSpotCheck(spotCheckId: string) {
  return useApiMutation<SpotCheckSaveDto>({
    mutationFn: (data, buCode) =>
      httpClient.patch(
        API_ENDPOINTS.SPOT_CHECK_REVIEW(buCode, spotCheckId),
        data,
      ),
    invalidateKeys: [QUERY_KEYS.SPOT_CHECKS, QUERY_KEYS.SPOT_CHECK_CURRENT],
    errorMessage: "Failed to submit spot check for review",
  });
}

/**
 * Hook ดึงข้อมูล review ของ Spot Check (variance summary)
 * GET /api/{buCode}/spot-check/{id}/review (path เดียวกับ submit แต่ method GET)
 * Response shape: SpotCheckReviewData (id, total, matched, variant, items[])
 *
 * @param id - รหัส spot check
 */
export function useSpotCheckReview(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<SpotCheckReviewData>({
    queryKey: [QUERY_KEYS.SPOT_CHECKS, buCode, id, "review"],
    queryFn: async () => {
      if (!buCode || !id) throw new Error("Missing buCode or spot check id");
      const res = await httpClient.get(
        API_ENDPOINTS.SPOT_CHECK_REVIEW(buCode, id),
      );
      if (!res.ok) throw new Error("Failed to fetch spot check review");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}

/**
 * Hook submit final ของ Spot Check (workflow approval)
 * PATCH /api/{buCode}/spot-check/{id}/submit (ไม่มี body)
 *
 * @param spotCheckId - รหัส spot check
 */
export function useSubmitSpotCheck(spotCheckId: string) {
  return useApiMutation<Record<string, never>>({
    mutationFn: (_data, buCode) =>
      httpClient.patch(
        API_ENDPOINTS.SPOT_CHECK_SUBMIT(buCode, spotCheckId),
        {},
      ),
    invalidateKeys: [QUERY_KEYS.SPOT_CHECKS, QUERY_KEYS.SPOT_CHECK_CURRENT],
    errorMessage: "Failed to submit spot check",
  });
}
