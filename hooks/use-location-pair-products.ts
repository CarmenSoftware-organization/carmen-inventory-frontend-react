import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { LocationPairProduct } from "@/types/product";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { CACHE_NORMAL } from "@/lib/cache-config";

/**
 * Hook ดึงรายการสินค้าที่มีอยู่ทั้งใน 2 location พร้อมกัน สำหรับใช้ใน stock transfer
 * ใช้ CACHE_NORMAL (staleTime 5 นาที) และ default perpage 30
 * จะไม่ fetch จนกว่า buCode, locationId1 และ locationId2 จะพร้อมทั้งหมด
 * @param locationId1 - id ของ location ต้นทาง
 * @param locationId2 - id ของ location ปลายทาง
 * @param params - พารามิเตอร์สำหรับ search/pagination
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ LocationPairProduct
 * @example
 * const { data } = useLocationPairProducts(fromId, toId, { search: query });
 */
export function useLocationPairProducts(
  locationId1: string | undefined,
  locationId2: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<LocationPairProduct>>({
    queryKey: [QUERY_KEYS.LOCATION_PAIR_PRODUCTS, buCode, locationId1, locationId2, params],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.LOCATION_PAIR_PRODUCTS(buCode!, locationId1!, locationId2!),
        { perpage: params?.perpage ?? 30, page: params?.page, search: params?.search },
      );
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!buCode && !!locationId1 && !!locationId2,
    ...CACHE_NORMAL,
  });
}
