import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  InventoryAdjustment,
  InventoryAdjustmentType,
  CreateInventoryAdjustmentDto,
} from "@/types/inventory-adjustment";
import type { PaginatedResponse, ParamsDto } from "@/types/params";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/**
 * เลือก API endpoint ตามประเภทการปรับปรุง stock
 * @param type - ประเภท stock-in หรือ stock-out
 * @returns ฟังก์ชัน endpoint ที่รับ buCode
 */
function getEndpoint(type: InventoryAdjustmentType) {
  return type === "stock-in" ? API_ENDPOINTS.STOCK_IN : API_ENDPOINTS.STOCK_OUT;
}

/**
 * Hook ดึงรายการ Inventory Adjustment ตาม business unit ปัจจุบัน
 * รวมทั้ง stock-in และ stock-out ใช้ CACHE_DYNAMIC (staleTime 1 นาที)
 * เพราะข้อมูล stock movement เปลี่ยนบ่อย จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์สำหรับ filter/pagination
 * @param options - ตัวเลือก enabled
 * @returns ผลลัพธ์ useQuery แบบ paginate ของ InventoryAdjustment
 * @example
 * const { data } = useInventoryAdjustment({ page: 1, perpage: 20, search: "ADJ" });
 */
export function useInventoryAdjustment(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<InventoryAdjustment>>({
    queryKey: [QUERY_KEYS.INVENTORY_ADJUSTMENTS, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(API_ENDPOINTS.INVENTORY_ADJUSTMENTS(buCode), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch inventory adjustments");
      return res.json();
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook ดึงข้อมูล Inventory Adjustment ตาม id และประเภท
 * เลือก endpoint ตามประเภท (stock-in/stock-out) และ unwrap data
 * จะไม่ fetch จนกว่า buCode, id และ type จะพร้อมทั้งหมด
 * @param id - id ของเอกสาร
 * @param type - ประเภท stock-in หรือ stock-out
 * @returns ผลลัพธ์ useQuery ของ InventoryAdjustment พร้อม type
 * @example
 * const { data } = useInventoryAdjustmentById(id, "stock-in");
 */
export function useInventoryAdjustmentById(
  id: string | undefined,
  type: InventoryAdjustmentType | undefined,
) {
  const buCode = useBuCode();

  return useQuery<InventoryAdjustment>({
    queryKey: [QUERY_KEYS.INVENTORY_ADJUSTMENTS, buCode, id, type],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      if (!type) throw new Error("Missing adjustment type");

      const endpoint = getEndpoint(type);
      const res = await httpClient.get(`${endpoint(buCode)}/${id}`);
      if (!res.ok) throw new Error("Failed to fetch inventory adjustment");

      const json = await res.json();
      return { ...json.data, type };
    },
    enabled: !!buCode && !!id && !!type,
  });
}

/**
 * Hook สำหรับสร้าง Inventory Adjustment ใหม่
 * เลือก endpoint ตาม type ภายใน mutationFn และ invalidate cache เมื่อสำเร็จ
 * @returns mutation object จาก useApiMutation
 * @example
 * const create = useCreateInventoryAdjustment();
 * create.mutate({ type: "stock-in", ...payload });
 */
export function useCreateInventoryAdjustment() {
  return useApiMutation<
    CreateInventoryAdjustmentDto & { type: InventoryAdjustmentType }
  >({
    mutationFn: ({ type, ...data }, buCode) => {
      const endpoint = getEndpoint(type);
      return httpClient.post(endpoint(buCode), data);
    },
    invalidateKeys: [QUERY_KEYS.INVENTORY_ADJUSTMENTS],
    errorMessage: "Failed to create inventory adjustment",
  });
}

/**
 * Hook สำหรับแก้ไข Inventory Adjustment ผ่าน PATCH
 * เลือก endpoint ตาม type และ invalidate รายการ inventory adjustment
 * @returns mutation object จาก useApiMutation
 * @example
 * const update = useUpdateInventoryAdjustment();
 * update.mutate({ id, type: "stock-out", ...values });
 */
export function useUpdateInventoryAdjustment() {
  return useApiMutation<
    CreateInventoryAdjustmentDto & {
      id: string;
      type: InventoryAdjustmentType;
      doc_version?: number;
    }
  >({
    mutationFn: ({ id, type, ...data }, buCode) => {
      const endpoint = getEndpoint(type);
      return httpClient.patch(`${endpoint(buCode)}/${id}`, data);
    },
    invalidateKeys: [QUERY_KEYS.INVENTORY_ADJUSTMENTS],
    errorMessage: "Failed to update inventory adjustment",
  });
}

/**
 * Hook สำหรับยกเลิก (void) Inventory Adjustment พร้อมระบุเหตุผล
 * ส่ง PATCH เปลี่ยน doc_status เป็น voided พร้อม void_reason
 * @returns mutation object จาก useApiMutation
 * @example
 * const voidIa = useVoidInventoryAdjustment();
 * voidIa.mutate({ id, type: "stock-in", void_reason: "Duplicate" });
 */
export function useVoidInventoryAdjustment() {
  return useApiMutation<{
    id: string;
    type: InventoryAdjustmentType;
    void_reason: string;
    doc_version?: number;
  }>({
    mutationFn: ({ id, type, void_reason, doc_version }, buCode) => {
      const endpoint = getEndpoint(type);
      return httpClient.patch(`${endpoint(buCode)}/${id}`, {
        doc_status: "voided",
        void_reason,
        doc_version,
      });
    },
    invalidateKeys: [QUERY_KEYS.INVENTORY_ADJUSTMENTS],
    errorMessage: "Failed to void inventory adjustment",
  });
}

/**
 * Hook สำหรับลบ Inventory Adjustment ตาม id และ type
 * เลือก endpoint ตาม type แล้ว DELETE และ invalidate cache
 * @returns mutation object จาก useApiMutation
 * @example
 * const del = useDeleteInventoryAdjustment();
 * del.mutate({ id, type: "stock-out" });
 */
export function useDeleteInventoryAdjustment() {
  return useApiMutation<{ id: string; type: InventoryAdjustmentType }>({
    mutationFn: ({ id, type }, buCode) => {
      const endpoint = getEndpoint(type);
      return httpClient.delete(`${endpoint(buCode)}/${id}`);
    },
    invalidateKeys: [QUERY_KEYS.INVENTORY_ADJUSTMENTS],
    errorMessage: "Failed to delete inventory adjustment",
  });
}

// --- Export ---

interface ExportInventoryAdjustmentArgs {
  params?: ParamsDto;
  columns: XlsxColumn<InventoryAdjustment>[];
}

/**
 * Hook ส่งออก IA เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportInventoryAdjustment, isExporting }
 */
export function useExportInventoryAdjustment() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportInventoryAdjustment = async ({ params, columns }: ExportInventoryAdjustmentArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<InventoryAdjustment>({
      fetch: async () => {
        const url = buildUrl(
          API_ENDPOINTS.INVENTORY_ADJUSTMENTS(buCode),
          params,
        );
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch inventory adjustments");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Inventory Adjustments",
      fileNamePrefix: "inventory-adjustment",
    });
  };

  return { exportInventoryAdjustment, isExporting };
}
