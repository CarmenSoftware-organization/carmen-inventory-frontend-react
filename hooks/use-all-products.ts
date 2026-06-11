import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { Product } from "@/types/product";
import type { PaginatedResponse } from "@/types/params";
import { CACHE_NORMAL } from "@/lib/cache-config";

/**
 * Hook ดึงข้อมูลสินค้าทั้งหมด (perpage=-1) สำหรับใช้ใน lookup/dropdown
 * ใช้ CACHE_NORMAL (staleTime 5 นาที) เพราะ master data ของสินค้าเปลี่ยนไม่บ่อย
 * คืนค่าเฉพาะ array ของ Product (unwrap จาก PaginatedResponse)
 * @returns UseQueryResult ของ Product[]
 * @example
 * const { data: products = [] } = useAllProducts();
 * const options = products.filter((p) => p.is_active);
 */
export function useAllProducts() {
  const buCode = useBuCode();

  return useQuery<Product[]>({
    queryKey: [QUERY_KEYS.PRODUCTS, buCode, "all"],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.PRODUCTS(buCode!), { perpage: -1 });
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch products");
      const json: PaginatedResponse<Product> = await res.json();
      return json.data;
    },
    enabled: !!buCode,
    ...CACHE_NORMAL,
  });
}
