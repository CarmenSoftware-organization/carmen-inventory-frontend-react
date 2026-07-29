import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import type { DashboardDataset } from "@/types/dashboard-dataset";
import type {
  DashboardDatasetDetail,
  WidgetParams,
} from "@/types/dashboard-widget";

interface DashboardDatasetListResponse {
  readonly items: readonly DashboardDataset[];
  readonly count: number;
}

/**
 * Catalog list — step 1 ใน flow (โหลดครั้งเดียวตอนเปิด picker)
 *
 * ยิงไป dashboard-lab เพราะเป็น endpoint เดียวที่แนบ `params[]` descriptor
 * มากับแต่ละ dataset — dataset ที่ไม่รับ param จะได้ `params: []` ทำให้ UI
 * ที่อ่าน descriptor ทำงานได้ทั้งชุดโดยไม่ต้อง hardcode ว่าตัวไหนมี param
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
        API_ENDPOINTS.DASHBOARD_LAB_DATASETS(buCode!),
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
 * Resolved data ของ dataset ตาม params ที่ส่งไป — ใช้ preview ก่อน save
 *
 * เป็น useQuery (ไม่ใช่ mutation) เพื่อให้ preview อัปเดตสดตอนผู้ใช้แก้ค่าใน
 * ฟอร์ม และได้ cache ฟรีเมื่อ toggle ค่ากลับไปค่าเดิม
 *
 * @param id - Dataset ID / ID ชุดข้อมูล
 * @param params - ค่า param ที่จะส่งไป execute
 * @param enabled - ส่ง false เพื่อเลื่อนการ fetch เช่นตอน dialog ยังไม่เปิด
 */
export function useDashboardDatasetPreview(
  id: string | undefined,
  params: WidgetParams,
  enabled = true,
) {
  const buCode = useBuCode();
  return useQuery<DashboardDatasetDetail>({
    queryKey: [QUERY_KEYS.DASHBOARD_DATASET_PREVIEW, buCode, id, params],
    queryFn: async () => {
      const res = await httpClient.post(
        API_ENDPOINTS.DASHBOARD_LAB_DATASET_EXEC(buCode!, id!),
        { params },
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to preview dataset");
      const json = await res.json();
      return json.data as DashboardDatasetDetail;
    },
    enabled: enabled && !!buCode && !!id,
    ...CACHE_DYNAMIC,
  });
}
