import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import type { DashboardDataset } from "@/types/dashboard-dataset";
import type { DashboardDatasetDetail } from "@/types/dashboard-widget";

interface DashboardDatasetListResponse {
  readonly items: readonly DashboardDataset[];
  readonly count: number;
}

/**
 * Catalog list — step 1 ใน flow (โหลดครั้งเดียวตอนเปิด picker)
 *
 * @param enabled - ส่ง false เพื่อเลื่อนการ fetch (lazy) จนกว่า caller จะพร้อม
 *   เช่น picker ที่จะโหลดต่อเมื่อผู้ใช้เปิด popover เท่านั้น
 */
export function useDashboardDatasets(enabled = true) {
  const buCode = useBuCode();
  return useQuery<DashboardDatasetListResponse>({
    queryKey: [QUERY_KEYS.DASHBOARD_DATASETS, buCode],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.DASHBOARD_DATASETS(buCode!),
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch dashboard datasets");
      const json = await res.json();
      return json.data as DashboardDatasetListResponse;
    },
    enabled: enabled && !!buCode,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Resolved data ของ dataset เดี่ยว — step 3 ใน flow (preview ก่อน save)
 *
 * ใช้ CACHE_DYNAMIC (1 นาที) เพราะค่าจริงเปลี่ยนได้ตามเวลา
 * คืน `{ meta, data }` พร้อม render ตาม `meta.shape`
 */
export function useDashboardDatasetDetail(id: string | undefined) {
  const buCode = useBuCode();
  return useQuery<DashboardDatasetDetail>({
    queryKey: [QUERY_KEYS.DASHBOARD_DATASETS, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.DASHBOARD_DATASET_BY_ID(buCode!, id!),
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch dataset detail");
      const json = await res.json();
      return json.data as DashboardDatasetDetail;
    },
    enabled: !!buCode && !!id,
    ...CACHE_DYNAMIC,
  });
}
