import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/lib/build-query-string";
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
    CreateInventoryAdjustmentDto & { type: InventoryAdjustmentType },
    // ระบุ response type เพื่อให้ caller อ่าน id ของใบที่เพิ่งสร้างได้ —
    // ia-form ใช้พาไปหน้าใบนั้นต่อ ไม่ใช่เด้งกลับหน้ารายการ และใช้ doc_version
    // ต่อให้ /commit ในกรณีที่กด commit ตั้งแต่ยังไม่เคยเซฟ draft
    { data?: { id?: string; doc_version?: number } }
  >({
    mutationFn: ({ type, ...data }, buCode) => {
      const endpoint = getEndpoint(type);
      return httpClient.post(endpoint(buCode), data);
    },
    invalidateKeys: [QUERY_KEYS.INVENTORY_ADJUSTMENTS],
    errorMessage: "Failed to create inventory adjustment",
    // backend คืน business error (เช่น "Insufficient stock") เป็น HTTP 500 ซึ่ง
    // toast กลางจะกลบเป็นข้อความ generic — ia-form จัดการ error เองใน
    // handleMutationError เอง — ดู skipsGlobalErrorToast ใน lib/api-error-handler.ts
    meta: { skipGlobalErrorToast: true },
  });
}

/**
 * Hook สำหรับแก้ไข Inventory Adjustment ผ่าน PATCH /{id}/save
 * เลือก endpoint ตาม type และ invalidate รายการ inventory adjustment
 *
 * ต่อท้ายด้วย `/save` เหมือน GRN/PO/physical-count/spot-check — ยิง `/{id}`
 * เปล่า ๆ ไม่ใช่ endpoint ที่หลังบ้านเปิดไว้ให้บันทึกการแก้ไข
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
    },
    // อ่าน doc_version ที่เพิ่มขึ้นหลัง save เพื่อส่งต่อให้ /commit
    { data?: { doc_version?: number } }
  >({
    mutationFn: ({ id, type, ...data }, buCode) => {
      const endpoint = getEndpoint(type);
      return httpClient.patch(`${endpoint(buCode)}/${id}/save`, data);
    },
    invalidateKeys: [QUERY_KEYS.INVENTORY_ADJUSTMENTS],
    errorMessage: "Failed to update inventory adjustment",
    // backend คืน business error (เช่น "Insufficient stock") เป็น HTTP 500 ซึ่ง
    // toast กลางจะกลบเป็นข้อความ generic — ia-form จัดการ error เองใน
    // handleMutationError เอง — ดู skipsGlobalErrorToast ใน lib/api-error-handler.ts
    meta: { skipGlobalErrorToast: true },
  });
}

/**
 * Hook สำหรับยกเลิก (void) Inventory Adjustment ผ่าน DELETE /{id}/void
 * ส่ง void_reason ไปกับ body สถานะมาจาก endpoint ไม่ต้องส่ง doc_status เอง
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
      // DELETE /{id}/void ไม่ใช่ PATCH /{id} เปล่า ๆ — สถานะมาจาก endpoint
      // ไม่ต้องยัด doc_status ไปใน body เอง (ท่าเดียวกับ GRN) · `delete` ของ
      // httpClient รับ body ผ่าน options ไม่ใช่ argument ที่สองเหมือน patch/post
      return httpClient.delete(`${endpoint(buCode)}/${id}/void`, {
        body: { void_reason, doc_version },
      });
    },
    invalidateKeys: [QUERY_KEYS.INVENTORY_ADJUSTMENTS],
    errorMessage: "Failed to void inventory adjustment",
  });
}

/**
 * Hook สำหรับปิดเอกสาร (commit) Inventory Adjustment ผ่าน PATCH /{id}/commit
 *
 * endpoint นี้เปลี่ยนแค่สถานะ ไม่ได้รับรายการสินค้าไปด้วย — ถ้าฟอร์มยังมีของที่แก้
 * ค้าง ต้อง save ให้เสร็จก่อนแล้วค่อยเรียกตัวนี้ด้วย doc_version ที่ได้กลับมาใหม่
 *
 * @returns mutation object จาก useApiMutation
 * @example
 * const commit = useCommitInventoryAdjustment();
 * commit.mutate({ id, type: "stock-in", doc_version: 1 });
 */
export function useCommitInventoryAdjustment() {
  return useApiMutation<{
    id: string;
    type: InventoryAdjustmentType;
    doc_version?: number;
  }>({
    mutationFn: ({ id, type, doc_version }, buCode) => {
      const endpoint = getEndpoint(type);
      return httpClient.patch(`${endpoint(buCode)}/${id}/commit`, {
        doc_version,
      });
    },
    invalidateKeys: [QUERY_KEYS.INVENTORY_ADJUSTMENTS],
    errorMessage: "Failed to commit inventory adjustment",
    // business error (เช่น stock ไม่พอ) มาเป็น 500 เหมือน create/update
    meta: { skipGlobalErrorToast: true },
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

  const exportInventoryAdjustment = async ({
    params,
    columns,
  }: ExportInventoryAdjustmentArgs) => {
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
