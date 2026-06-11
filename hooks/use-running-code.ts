import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { useXlsxExport, type XlsxColumn } from "@/hooks/use-xlsx-export";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { useProfile } from "@/hooks/use-profile";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { ApiError } from "@/lib/api-error";
import type { RunningCode, CreateRunningCodeDto } from "@/types/running-code";
import type { ParamsDto } from "@/types/params";

const crud = createConfigCrud<RunningCode, CreateRunningCodeDto>({
  queryKey: QUERY_KEYS.RUNNING_CODES,
  endpoint: API_ENDPOINTS.RUNNING_CODES,
  label: "running code",
});

/**
 * Hook ดึงรายการ running code (รหัสเอกสารอัตโนมัติ) แบบแบ่งหน้า
 *
 * Re-export จาก factory สำหรับจัดการ prefix/format ของเอกสาร PR/PO/GRN ฯลฯ
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<RunningCode>
 * @example
 * ```ts
 * const { data } = useRunningCode({ page: 1, perpage: 20 });
 * ```
 */
export const useRunningCode = crud.useList;

/**
 * Hook ดึง running code ตาม id
 *
 * @param id - id ของ running code
 * @returns UseQueryResult ของ RunningCode
 * @example
 * ```ts
 * const { data } = useRunningCodeById(params.id);
 * ```
 */
export const useRunningCodeById = crud.useById;

/**
 * Hook สำหรับสร้าง running code ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateRunningCode().mutate({ code: "PR", prefix: "PR", digit_length: 5 });
 * ```
 */
export const useCreateRunningCode = crud.useCreate;

/**
 * Hook สำหรับแก้ไข running code
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateRunningCode().mutate({ id, digit_length: 6 });
 * ```
 */
export const useUpdateRunningCode = crud.useUpdate;

/**
 * Hook สำหรับลบ running code
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteRunningCode().mutate(rc.id);
 * ```
 */
export const useDeleteRunningCode = crud.useDelete;

/**
 * Hook เริ่มต้น (initialize) ตาราง running code สำหรับ BU ปัจจุบัน
 *
 * ยิง POST ไป `/config/{bu}/running-codes/init` เพื่อสร้างเรคคอร์ดเริ่มต้นทั้งชุด
 * ใช้ครั้งเดียวตอน setup BU ใหม่ invalidate list หลังสำเร็จ
 * error เป็น `ApiError`
 *
 * @returns UseMutationResult ไม่รับ variable
 * @example
 * ```ts
 * const init = useInitRunningCode();
 * init.mutate();
 * ```
 */
export function useInitRunningCode() {
  const { buCode } = useProfile();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, void>({
    mutationFn: async () => {
      const url = API_ENDPOINTS.RUNNING_CODES_INIT(buCode!);
      const res = await httpClient.post(url);
      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to init running code");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.RUNNING_CODES],
      });
    },
  });
}

// --- Export ---

interface ExportRunningCodeArgs {
  params?: ParamsDto;
  columns: XlsxColumn<RunningCode>[];
}

/**
 * Hook ส่งออก Running Code เป็นไฟล์ xlsx ฝั่ง client โดยใช้ filter ปัจจุบัน
 * และ endpoint เดียวกับ list — caller กำหนด columns พร้อม translation
 * @returns { exportRunningCode, isExporting }
 */
export function useExportRunningCode() {
  const buCode = useBuCode();
  const { exportToXlsx, isExporting } = useXlsxExport();

  const exportRunningCode = async ({
    params,
    columns,
  }: ExportRunningCodeArgs) => {
    if (!buCode) throw new Error("Missing buCode");
    return exportToXlsx<RunningCode>({
      fetch: async () => {
        const url = buildUrl(API_ENDPOINTS.RUNNING_CODES(buCode), params);
        const res = await httpClient.get(url);
        if (!res.ok) throw new Error("Failed to fetch running codes");
        const json = await res.json();
        return json.data ?? [];
      },
      columns,
      sheetName: "Running Codes",
      fileNamePrefix: "running-code",
    });
  };

  return { exportRunningCode, isExporting };
}
