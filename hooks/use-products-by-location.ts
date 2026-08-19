import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { Product } from "@/types/product";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { CACHE_NORMAL } from "@/lib/cache-config";

/**
 * Hook ดึงรายการสินค้าที่ผูกกับ location ที่กำหนด
 * ใช้ CACHE_NORMAL (staleTime 5 นาที) default perpage 30
 * จะไม่ fetch จนกว่า buCode และ locationId จะพร้อม
 * @param locationId - รหัสคลัง/สถานที่
 * @param params - พารามิเตอร์ pagination/search
 * @param workflowId - ส่งมาเมื่อต้องกรองตาม workflow ด้วย (endpoint
 *   products-location-workflow) — ถ้าส่งมาแต่ยังว่าง จะไม่ fetch จนกว่าจะมีค่า
 * @returns React Query ของ PaginatedResponse<Product> ใน location
 * @example
 * const { data } = useProductsByLocation(locationId, { search: query });
 */
export function useProductsByLocation(
  locationId: string | undefined,
  params?: ParamsDto,
  workflowId?: string,
) {
  const buCode = useBuCode();
  const useWorkflow = workflowId !== undefined;

  return useQuery<PaginatedResponse<Product>>({
    queryKey: [
      QUERY_KEYS.PRODUCTS_BY_LOCATION,
      buCode,
      locationId,
      workflowId,
      params,
    ],
    queryFn: async () => {
      const url = buildUrl(
        useWorkflow
          ? API_ENDPOINTS.PRODUCTS_BY_LOCATION_WORKFLOW(
              buCode!,
              locationId!,
              workflowId!,
            )
          : API_ENDPOINTS.PRODUCTS_BY_LOCATION(buCode!, locationId!),
        {
          perpage: params?.perpage ?? 30,
          page: params?.page,
          search: params?.search,
        },
      );
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!buCode && !!locationId && (!useWorkflow || !!workflowId),
    ...CACHE_NORMAL,
  });
}
