import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type {
  PurchaseRequestTemplate,
  CreatePrtDto,
} from "@/types/purchase-request";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { CACHE_STATIC } from "@/lib/cache-config";

/**
 * Hook ดึงรายการ template ของ purchase request (PRT)
 * ใช้ CACHE_STATIC (staleTime 30 นาที) เพราะ template เปลี่ยนแปลงไม่บ่อย
 * จะไม่ fetch จนกว่า buCode จะพร้อม
 * @param params - พารามิเตอร์ filter/sort/pagination
 * @param options - ตัวเลือกเสริม เช่น enabled
 * @returns React Query ของ PaginatedResponse<PurchaseRequestTemplate>
 * @example
 * const { data } = usePrt({ page: 1, perpage: 20 });
 */
export function usePrt(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<PurchaseRequestTemplate>>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUEST_TEMPLATES, buCode, params],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.PURCHASE_REQUEST_TEMPLATES(buCode!),
        params,
      );
      const res = await httpClient.get(url);
      if (!res.ok)
        throw new Error("Failed to fetch purchase request templates");
      return res.json();
    },
    ...CACHE_STATIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook ดึงข้อมูล PRT ตาม id
 * Unwrap data จาก response จะไม่ fetch จนกว่า buCode และ id จะพร้อม
 * @param id - รหัส PRT
 * @returns React Query ของ PurchaseRequestTemplate
 * @example
 * const { data: prt } = usePrtById(id);
 */
export function usePrtById(id: string | undefined) {
  const buCode = useBuCode();

  return useQuery<PurchaseRequestTemplate>({
    queryKey: [QUERY_KEYS.PURCHASE_REQUEST_TEMPLATES, buCode, id],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.PURCHASE_REQUEST_TEMPLATES(buCode!)}/${id}`,
      );
      if (!res.ok)
        throw new Error("Failed to fetch purchase request template");
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}

/**
 * Hook สร้าง PRT ใหม่
 * POST payload และ invalidate cache รายการ PRT
 * @returns Mutation ที่ resolve เป็น { data: { id } }
 * @example
 * const create = useCreatePrt();
 * const res = await create.mutateAsync(payload);
 */
export function useCreatePrt() {
  return useApiMutation<CreatePrtDto, { data: { id: string } }>({
    mutationFn: (data, buCode) =>
      httpClient.post(
        API_ENDPOINTS.PURCHASE_REQUEST_TEMPLATES(buCode),
        data,
      ),
    invalidateKeys: [QUERY_KEYS.PURCHASE_REQUEST_TEMPLATES],
    errorMessage: "Failed to create purchase request template",
  });
}

/**
 * Hook แก้ไข PRT ผ่าน PUT โดยระบุ id
 * Invalidate cache รายการ PRT เมื่อสำเร็จ
 * @returns Mutation สำหรับแก้ไข PRT
 * @example
 * const update = useUpdatePrt();
 * update.mutate({ id, ...values });
 */
export function useUpdatePrt() {
  return useApiMutation<CreatePrtDto & { id: string }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.put(
        `${API_ENDPOINTS.PURCHASE_REQUEST_TEMPLATES(buCode)}/${id}`,
        data,
      ),
    invalidateKeys: [QUERY_KEYS.PURCHASE_REQUEST_TEMPLATES],
    errorMessage: "Failed to update purchase request template",
  });
}

/**
 * Hook ลบ PRT ตาม id
 * DELETE และ invalidate รายการ PRT
 * @returns Mutation สำหรับลบ PRT
 * @example
 * const del = useDeletePrt();
 * del.mutate(id);
 */
export function useDeletePrt() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(
        `${API_ENDPOINTS.PURCHASE_REQUEST_TEMPLATES(buCode)}/${id}`,
      ),
    invalidateKeys: [QUERY_KEYS.PURCHASE_REQUEST_TEMPLATES],
    errorMessage: "Failed to delete purchase request template",
  });
}

// --- Export ---

interface ExportPrtArgs {
  params?: ParamsDto;
  columns: XlsxColumn<PurchaseRequestTemplate>[];
}

/**
 * Hook ส่งออก PRT เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบันและ endpoint
 * เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportPrt, isExporting }
 */
export function useExportPrt() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportPrt = async ({ params, columns }: ExportPrtArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<PurchaseRequestTemplate>({
      fetch: async () => {
        const url = buildUrl(
          API_ENDPOINTS.PURCHASE_REQUEST_TEMPLATES(buCode),
          params,
        );
        const res = await httpClient.get(url);
        if (!res.ok)
          throw new Error("Failed to fetch purchase request templates");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "PR Templates",
      fileNamePrefix: "purchase-request-template",
    });
  };

  return { exportPrt, isExporting };
}
