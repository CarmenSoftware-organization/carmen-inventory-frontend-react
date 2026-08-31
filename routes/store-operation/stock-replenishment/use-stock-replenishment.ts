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

/**
 * ทั้งสอง endpoint ไม่ได้แค่สร้างเอกสาร — `verify()` ฝั่ง micro-business ตรวจให้ด้วยว่า
 * workflow อนุญาตสินค้าชุดนี้ไหม ผู้ใช้มีสิทธิ์ในคลังที่ระบุไหม สินค้าอยู่ในคลังนั้นจริงไหม
 * และหน่วยที่ขอมีตัวคูณแปลงหน่วยจริงไหม (ตัวคูณอ่านจากตารางหน่วยของสินค้าเอง ไม่รับจาก
 * client) ฝั่ง FE จึงต้องยิงผ่านทางนี้ ไม่ใช่ประกอบใบเองแล้วส่งเข้า endpoint สร้าง PR/SR ปกติ
 *
 * shape ต้องตรงกับ `StockReplenishmentCreatePrSchema`/`...SrSchema` เป๊ะ — gateway ตัดฟิลด์
 * ที่ไม่ได้ประกาศทิ้งก่อน validate ส่งชื่อฟิลด์ผิดจึงได้ 400 ว่า "ของที่ต้องมีหายไป"
 * ไม่ใช่ "ฟิลด์นี้ไม่รู้จัก"
 */
export interface CreateStockReplPrDto {
  products: Array<{
    id: string;
    request_unit_id: string;
    request_qty: number;
  }>;
  workflow_id: string;
  /** คลังที่ของขาด — ทุกบรรทัดของใบใช้คลังนี้ หนึ่งใบจึงผูกได้คลังเดียว */
  location_id: string;
}

/**
 * ใบเบิกไม่มีหน่วยให้เลือก (ย้ายของในหน่วยคลังของสินค้าอยู่แล้ว) `location_id` กลายเป็น
 * ปลายทาง ส่วน `from_location` คือคลังต้นทางที่จ่ายของ
 */
export interface CreateStockReplSrDto {
  products: Array<{
    id: string;
    request_qty: number;
  }>;
  workflow_id: string;
  location_id: string;
  from_location: string;
}

/**
 * Hook สร้าง PR จากรายการที่เลือกในหน้า stock replenishment
 * ยิง `POST /api/{bu}/stock-replenishments/pr` แล้ว invalidate list
 * @returns mutation รับ CreateStockReplPrDto
 * @example
 * useCreateStockReplPr().mutate({ products, workflow_id, location_id });
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
 * @returns mutation รับ CreateStockReplSrDto
 * @example
 * useCreateStockReplSr().mutate({ products, workflow_id, location_id, from_location });
 */
export function useCreateStockReplSr() {
  return useApiMutation<CreateStockReplSrDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(`${API_ENDPOINTS.STOCK_REPLENISHMENT(buCode)}/sr`, data),
    invalidateKeys: [QUERY_KEYS.STOCK_REPLENISHMENT],
    errorMessage: "Failed to create store requisition",
  });
}
