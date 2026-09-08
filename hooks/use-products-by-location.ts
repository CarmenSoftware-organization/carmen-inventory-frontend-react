import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { ProductLookupItem } from "@/types/product";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { CACHE_NORMAL } from "@/lib/cache-config";

/**
 * แถวดิบจาก `products-location-workflow` — เป็นแถวของตาราง product_location
 * ไม่ใช่ตัวสินค้า `id` จึงเป็น id ของแถวเชื่อม ส่วนสินค้าจริงอยู่ที่ `product_id`
 * และชื่อ/รหัสมาแบบ flat ขึ้นต้น `product_`
 */
interface WorkflowProductRow {
  id: string;
  product_id: string;
  product_code: string | null;
  product_name: string | null;
  product_local_name: string | null;
  product_sku: string | null;
  inventory_unit_id: string | null;
  inventory_unit_name: string | null;
}

/**
 * แปลงแถวจากเส้น workflow ให้เป็นรูปเดียวกับเส้นธรรมดา
 *
 * **`id` ต้องมาจาก `product_id` ไม่ใช่ `id`** — ฟอร์มเอาค่านี้ไปเก็บใน
 * `items[].product_id` แล้วส่งขึ้น backend ถ้าหยิบ `id` มาตรง ๆ จะได้ id ของแถว
 * product_location ซึ่งเป็นคนละตัวและไม่มีใครจับได้จนกว่าจะบันทึกแล้วพัง
 */
export function normalizeWorkflowProduct(
  row: WorkflowProductRow,
): ProductLookupItem {
  return {
    id: row.product_id,
    code: row.product_code ?? "",
    name: row.product_name ?? "",
    local_name: row.product_local_name ?? "",
    sku: row.product_sku ?? undefined,
    inventory_unit: row.inventory_unit_id
      ? { id: row.inventory_unit_id, name: row.inventory_unit_name ?? "" }
      : undefined,
    inventory_unit_name: row.inventory_unit_name ?? undefined,
  };
}

/**
 * Hook ดึงรายการสินค้าที่ผูกกับ location ที่กำหนด
 * ใช้ CACHE_NORMAL (staleTime 5 นาที) default perpage 30
 * จะไม่ fetch จนกว่า buCode และ locationId จะพร้อม
 *
 * **สอง endpoint คืน shape คนละแบบ** — เส้นธรรมดาคืน `{ id, code, name,
 * inventory_unit }` ตรงกับที่ lookup ต้องการอยู่แล้ว ส่วนเส้น workflow คืนแถว
 * product_location แบบ flat (`product_code` / `product_name` / `product_id`)
 * hook จึง normalize ให้ก่อนส่งออก caller จะได้ไม่ต้องรู้ว่าตัวเองอยู่เส้นไหน
 *
 * @param locationId - รหัสคลัง/สถานที่
 * @param params - พารามิเตอร์ pagination/search
 * @param workflowId - ส่งมาเมื่อต้องกรองตาม workflow ด้วย (endpoint
 *   products-location-workflow) — ถ้าส่งมาแต่ยังว่าง จะไม่ fetch จนกว่าจะมีค่า
 * @returns React Query ของ PaginatedResponse<ProductLookupItem> ใน location
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

  return useQuery<PaginatedResponse<ProductLookupItem>>({
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
      const json = await res.json();
      if (!useWorkflow) return json as PaginatedResponse<ProductLookupItem>;
      return {
        ...json,
        data: (json.data ?? []).map(normalizeWorkflowProduct),
      } as PaginatedResponse<ProductLookupItem>;
    },
    enabled: !!buCode && !!locationId && (!useWorkflow || !!workflowId),
    ...CACHE_NORMAL,
  });
}
