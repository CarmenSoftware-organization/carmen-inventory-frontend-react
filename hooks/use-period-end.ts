import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  PeriodEnd,
  PeriodEndReview,
  ReviewTransactionKey,
  ReviewTransactionStat,
} from "@/types/period-end";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/**
 * Hook ดึงรายการ Period End แบบแบ่งหน้า
 *
 * เรียก `GET /period-ends` ของ BU ปัจจุบัน
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @returns UseQueryResult ของ PaginatedResponse<PeriodEnd>
 * @example
 * ```ts
 * const { data } = usePeriodEnd({ page: 1, perpage: 20 });
 * ```
 */
export function usePeriodEnd(params?: ParamsDto) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<PeriodEnd>>({
    queryKey: [QUERY_KEYS.PERIOD_ENDS, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.PERIOD_ENDS(buCode!), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch period ends");
      return res.json();
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงงวด Period End ปัจจุบันของ BU
 *
 * เรียก `GET /period-ends/current` ใช้ cache dynamic (1 นาที)
 *
 * @returns UseQueryResult ของ PeriodEnd
 * @example
 * ```ts
 * const { data: current } = usePeriodEndCurrent();
 * ```
 */
export function usePeriodEndCurrent() {
  const buCode = useBuCode();

  return useQuery<PeriodEnd>({
    queryKey: [QUERY_KEYS.PERIOD_ENDS, buCode, "current"],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PERIOD_END_CURRENT(buCode!),
      );
      if (!res.ok) throw new Error("Failed to fetch current period end");
      const json: { data: PeriodEnd } = await res.json();
      return json.data;
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงข้อมูล review ก่อนปิดงวด Period End
 *
 * เรียก `GET /period-ends/review` ใช้ cache dynamic (1 นาที)
 *
 * @returns UseQueryResult ของ PeriodEnd
 * @example
 * ```ts
 * const { data: review } = usePeriodEndReview();
 * ```
 */
type RawTransactionStat = Omit<ReviewTransactionStat, "is_complete"> & {
  is_complete: boolean | "true" | "false";
};
type RawPeriodEndReview = Omit<PeriodEndReview, "details"> & {
  details: {
    transaction: Record<ReviewTransactionKey, RawTransactionStat>;
    physical_count: PeriodEndReview["details"]["physical_count"];
  };
};

export function usePeriodEndReview() {
  const buCode = useBuCode();

  return useQuery<PeriodEndReview>({
    queryKey: [QUERY_KEYS.PERIOD_ENDS, buCode, "review"],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PERIOD_END_REVIEW(buCode!),
      );
      if (!res.ok) throw new Error("Failed to fetch period end review");
      const json: { data: RawPeriodEndReview } = await res.json();
      const raw = json.data;
      const transaction = Object.fromEntries(
        (Object.keys(raw.details.transaction) as ReviewTransactionKey[]).map(
          (key) => {
            const stat = raw.details.transaction[key];
            return [key, { ...stat, is_complete: stat.is_complete === true || stat.is_complete === "true" }];
          },
        ),
      ) as Record<ReviewTransactionKey, ReviewTransactionStat>;
      return {
        ...raw,
        details: { transaction, physical_count: raw.details.physical_count },
      };
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook สำหรับปิดงวด (Close Period End)
 *
 * ยิง `POST /period-ends` ของ BU ปัจจุบัน invalidate list/current/review หลังสำเร็จ
 *
 * @returns UseMutationResult รับ `CreatePeriodEndDto` เป็น variable
 * @example
 * ```ts
 * const close = useClosePeriodEnd();
 * close.mutate({ ... });
 * ```
 */
export function useClosePeriodEnd() {
  return useApiMutation<void>({
    mutationFn: (_data, buCode) =>
      httpClient.post(API_ENDPOINTS.PERIOD_ENDS(buCode)),
    invalidateKeys: [QUERY_KEYS.PERIOD_ENDS],
    errorMessage: "Failed to close period end",
  });
}
