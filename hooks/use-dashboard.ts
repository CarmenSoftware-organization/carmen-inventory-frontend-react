import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

interface PendingCount {
  pending: number;
}

/**
 * Hook ดึงจำนวน Store Requisition ที่รอดำเนินการของผู้ใช้ปัจจุบัน
 * ใช้แสดง badge ใน sidebar/dashboard card
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที)
 * @returns UseQueryResult ของ { pending: number }
 * @example
 * const { data } = useMyPendingSrCount();
 * <Badge>{data?.pending ?? 0}</Badge>
 */
export function useMyPendingSrCount() {
  return useQuery<PendingCount>({
    queryKey: [QUERY_KEYS.MY_PENDING_STORE_REQUISITIONS_COUNT],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.MY_PENDING_STORE_REQUISITIONS_COUNT,
      );
      if (!res.ok) throw new Error("Failed to fetch SR pending count");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงจำนวน Purchase Request ที่รอดำเนินการของผู้ใช้ปัจจุบัน
 * ใช้แสดง badge ใน sidebar/dashboard card
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที)
 * @returns UseQueryResult ของ { pending: number }
 * @example
 * const { data } = useMyPendingPrCount();
 */
export function useMyPendingPrCount() {
  return useQuery<PendingCount>({
    queryKey: [QUERY_KEYS.MY_PENDING_PURCHASE_REQUESTS_COUNT],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.MY_PENDING_PURCHASE_REQUESTS_COUNT,
      );
      if (!res.ok) throw new Error("Failed to fetch PR pending count");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_DYNAMIC,
  });
}

/**
 * Hook ดึงจำนวน Purchase Order ที่รอดำเนินการของผู้ใช้ปัจจุบัน
 * ใช้แสดง badge ใน sidebar/dashboard card
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที)
 * @returns UseQueryResult ของ { pending: number }
 * @example
 * const { data } = useMyPendingPoCount();
 */
export function useMyPendingPoCount() {
  return useQuery<PendingCount>({
    queryKey: [QUERY_KEYS.MY_PENDING_PURCHASE_ORDERS_COUNT],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.MY_PENDING_PURCHASE_ORDERS_COUNT,
      );
      if (!res.ok) throw new Error("Failed to fetch PO pending count");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_DYNAMIC,
  });
}
