import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { Location } from "@/types/location";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { CACHE_NORMAL } from "@/lib/cache-config";

/**
 * Hook ดึงรายการ Location ที่มี stock ของ product ที่ระบุ
 * ใช้สำหรับ lookup ตอนเลือกต้นทาง/ปลายทางใน stock transfer
 * ใช้ CACHE_NORMAL (staleTime 5 นาที) จะไม่ fetch จนกว่า buCode และ productId จะพร้อม
 *
 * ส่ง `workflowId` มาด้วยเมื่อไหร่ จะสลับไปยิง endpoint ที่กรองด้วย workflow
 * (`config/:bu/workflows/:wf/products/:product/locations`) แทน — ฟอร์ม PO ใช้ทางนี้
 * เพราะ location ต้องอยู่ในรายการที่ workflow อนุญาต ไม่ใช่แค่สิทธิ์ของ user
 *
 * @param productId - id ของ product
 * @param params - พารามิเตอร์สำหรับ search/pagination
 * @param workflowId - id ของ workflow (ถ้ามี = ใช้ endpoint แบบ workflow-scoped)
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ Location
 * @example
 * const { data } = useLocationsByProduct(productId, { search: "store" });
 */
export function useLocationsByProduct(
  productId: string | undefined,
  params?: ParamsDto,
  workflowId?: string,
) {
  const buCode = useBuCode();
  const scoped = !!workflowId;

  return useQuery<PaginatedResponse<Location>>({
    queryKey: scoped
      ? [
          QUERY_KEYS.LOCATIONS_BY_WORKFLOW_PRODUCT,
          buCode,
          workflowId,
          productId,
          params,
        ]
      : [QUERY_KEYS.LOCATIONS_BY_PRODUCT, buCode, productId, params],
    queryFn: async () => {
      const url = buildUrl(
        scoped
          ? API_ENDPOINTS.LOCATIONS_BY_WORKFLOW_PRODUCT(
              buCode!,
              workflowId!,
              productId!,
            )
          : API_ENDPOINTS.LOCATIONS_BY_PRODUCT(buCode!, productId!),
        {
          perpage: params?.perpage ?? 30,
          page: params?.page,
          search: params?.search,
        },
      );
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
    enabled: !!buCode && !!productId,
    ...CACHE_NORMAL,
  });
}
