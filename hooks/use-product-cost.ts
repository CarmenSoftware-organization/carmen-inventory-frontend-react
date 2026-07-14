import { useQuery } from "@tanstack/react-query";
import { httpClient } from "@/lib/http-client";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

export interface ProductCostByLocationQty {
  product_id?: string;
  location_id?: string;
  qty?: number;
  average_cost_per_unit: number;
  total_cost: number;
  currency?: string;
  unit_name?: string;
}

export interface ProductLastReceiving {
  grn_id?: string;
  grn_no?: string;
  received_at?: string;
  vendor_id?: string;
  vendor_name?: string;
  qty?: number;
  unit_name?: string;
  total_cost: number;
  currency?: string;
}

/**
 * Last receiving cost ต่อ inventory unit — shape ตรงกับ response ของ endpoint
 * PRODUCT_LAST_RECEIVING_BY_UNIT (source doc + ต้นทุนต่อหน่วยครั้งล่าสุดที่รับเข้า)
 */
export interface ProductLastReceivingByUnit {
  /** ชนิดเอกสารต้นทาง เช่น "good_received_note" */
  type?: string;
  /** เลขที่เอกสารต้นทาง (เช่น GRN no) */
  no?: string;
  /** id เอกสารต้นทาง */
  id?: string;
  /** ต้นทุนต่อหน่วย (ตาม inventory unit ที่ query) ครั้งล่าสุดที่รับเข้า */
  cost_per_unit: number;
  currency_id?: string;
  currency_code?: string;
  exchange_rate?: number;
  vendor_id?: string;
  vendor_name?: string;
}

export function useProductCostByLocationQty(
  buCode: string | undefined,
  productId: string | undefined,
  locationId: string | undefined,
  qty: number | undefined,
) {
  return useQuery<ProductCostByLocationQty>({
    queryKey: [
      QUERY_KEYS.PRODUCT_COST_BY_LOCATION_QTY,
      buCode,
      productId,
      locationId,
      qty,
    ],
    queryFn: async () => {
      if (!buCode || !productId || !locationId || qty === undefined) {
        throw new Error("Missing required params");
      }
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCT_COST_BY_LOCATION_QTY(
          buCode,
          productId,
          locationId,
          qty,
        ),
      );
      if (!res.ok) throw new Error("Failed to fetch product cost");
      const json = await res.json();
      return json.data ?? json;
    },
    enabled:
      !!buCode && !!productId && !!locationId && qty !== undefined && qty > 0,
    ...CACHE_DYNAMIC,
  });
}

/**
 * Last receiving cost ต่อ inventory unit — ยิงตอน `enabled` เป็น true เท่านั้น
 * (ใช้ hover-to-fetch ข้าง U.Price) → คืน `ProductLastReceivingByUnit` (หรือ null
 * ถ้ายังไม่เคยรับเข้า)
 */
export function useProductLastReceivingByUnit(
  buCode: string | undefined,
  productId: string | undefined,
  unitId: string | undefined,
  enabled = true,
) {
  return useQuery<ProductLastReceivingByUnit | null>({
    queryKey: [
      QUERY_KEYS.PRODUCT_LAST_RECEIVING_BY_UNIT,
      buCode,
      productId,
      unitId,
    ],
    queryFn: async () => {
      if (!buCode || !productId || !unitId) {
        throw new Error("Missing required params");
      }
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCT_LAST_RECEIVING_BY_UNIT(buCode, productId, unitId),
      );
      if (!res.ok) {
        throw new Error("Failed to fetch product last receiving by unit");
      }
      const json = await res.json();
      return json.data ?? null;
    },
    enabled: enabled && !!buCode && !!productId && !!unitId,
    ...CACHE_DYNAMIC,
  });
}

export function useProductLastReceiving(
  buCode: string | undefined,
  productId: string | undefined,
) {
  return useQuery<ProductLastReceiving | null>({
    queryKey: [QUERY_KEYS.PRODUCT_LAST_RECEIVING, buCode, productId],
    queryFn: async () => {
      if (!buCode || !productId) {
        throw new Error("Missing required params");
      }
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCT_LAST_RECEIVING(buCode, productId),
      );
      if (!res.ok) throw new Error("Failed to fetch product last receiving");
      const json = await res.json();
      return json.data ?? null;
    },
    enabled: !!buCode && !!productId,
    ...CACHE_DYNAMIC,
  });
}
