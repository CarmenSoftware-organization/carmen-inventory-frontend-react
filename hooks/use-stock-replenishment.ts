import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { CACHE_DYNAMIC } from "@/lib/cache-config";
import type { Locations } from "@/types/stock-replenishment";

export function useStockReplenishment() {
  const buCode = useBuCode();

  return useQuery<Locations>({
    queryKey: [QUERY_KEYS.STOCK_REPLENISHMENT, buCode],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const res = await httpClient.get(
        API_ENDPOINTS.STOCK_REPLENISHMENT(buCode),
      );
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to fetch stock replenishment");
      }
      const json = await res.json();
      return json.data ?? [];
    },
    enabled: !!buCode,
    ...CACHE_DYNAMIC,
  });
}

// --- Create PR / SR from selection ---

export interface CreateStockReplPrDto {
  product_ids: string[];
  workflow_id: string;
}

export interface CreateStockReplSrDto extends CreateStockReplPrDto {
  from_location: string;
}

/**
 * Hook สร้าง PR จากรายการที่เลือกในหน้า stock replenishment
 * ยิง `POST /api/{bu}/stock-replenishments/pr` แล้ว invalidate list
 * @returns mutation รับ CreateStockReplPrDto
 * @example
 * useCreateStockReplPr().mutate({ product_ids, workflow_id });
 */
export function useCreateStockReplPr() {
  return useApiMutation<CreateStockReplPrDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(`${API_ENDPOINTS.STOCK_REPLENISHMENT(buCode)}/pr`, data),
    invalidateKeys: [QUERY_KEYS.STOCK_REPLENISHMENT],
    errorMessage: "Failed to create purchase request",
  });
}

/**
 * Hook สร้าง SR จากรายการที่เลือกในหน้า stock replenishment
 * ยิง `POST /api/{bu}/stock-replenishments/sr` แล้ว invalidate list
 * @returns mutation รับ CreateStockReplSrDto (มี from_location เพิ่ม)
 * @example
 * useCreateStockReplSr().mutate({ product_ids, workflow_id, from_location });
 */
export function useCreateStockReplSr() {
  return useApiMutation<CreateStockReplSrDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(`${API_ENDPOINTS.STOCK_REPLENISHMENT(buCode)}/sr`, data),
    invalidateKeys: [QUERY_KEYS.STOCK_REPLENISHMENT],
    errorMessage: "Failed to create store requisition",
  });
}
