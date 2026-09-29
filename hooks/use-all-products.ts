import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { Product } from "@/types/product";
import { fetchAllPages } from "@/lib/fetch-all-pages";
import { CACHE_NORMAL } from "@/lib/cache-config";

/**
 * Hook ดึงสินค้าทั้งหมด (วนหน้าละ 100 ผ่าน fetchAllPages) — ชั่วคราวจนช่วง 4b เปลี่ยนต้นไม้สินค้า
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
    queryFn: () =>
      fetchAllPages<Product>(async (page, perpage) => {
        const url = buildUrl(API_ENDPOINTS.PRODUCTS(buCode!), {
          page,
          perpage,
        });
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch products");
        return res.json();
      }),
    enabled: !!buCode,
    ...CACHE_NORMAL,
  });
}
