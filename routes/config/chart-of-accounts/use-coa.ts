import { createConfigCrud } from "@/hooks/use-config-crud";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  ChartOfAccount,
  CreateChartOfAccountDto,
} from "@/types/chart-of-accounts";

const crud = createConfigCrud<ChartOfAccount, CreateChartOfAccountDto>({
  queryKey: QUERY_KEYS.CHART_OF_ACCOUNTS,
  endpoint: API_ENDPOINTS.CHART_OF_ACCOUNTS,
  label: "account code",
  updateMethod: "PATCH",
});

export const useChartOfAccount = crud.useList;

export const useChartOfAccountById = crud.useById;

export const useCreateChartOfAccount = crud.useCreate;

export const useUpdateChartOfAccount = crud.useUpdate;

export const useDeleteChartOfAccount = crud.useDelete;

/**
 * ผลลัพธ์ของการนำเข้าผังบัญชี — ตัวนับกับรายการแถวที่ผิด
 *
 * ฝั่ง backend เขียนแบบ all-or-nothing: ถ้ามีแถวผิดแม้แถวเดียวจะไม่เขียนอะไรเลย
 * และตอบ 400 พร้อม `errors` ชุดเดียวกันนี้ ค่าใน `summary` จึงเป็น 0 ทั้งหมดในกรณีนั้น
 */
export interface ChartOfAccountsImportResult {
  summary: {
    total_rows: number;
    created: number;
    updated: number;
    skipped: number;
    deleted: number;
    errors: number;
  };
  errors: { row: number; column?: string; message: string }[];
  deleted_codes: string[];
}

/**
 * ดึงผังบัญชีจาก Carmen 4 ตามคอนฟิก `interface_accounting_carmen_gl` ของ BU
 *
 * **ไม่รับพารามิเตอร์ใด ๆ โดยตั้งใจ** — เรื่องรหัสซ้ำและรหัสที่มีเฉพาะฝั่งเรา ตัดสินจาก
 * `sync_policy` ในคอนฟิกนั้น (ตั้งที่ `/system-admin/interface/accounting/carmen_gl`)
 * ไม่ใช่จากคำขอ การกดปุ่มกับการรันตามกำหนดเวลาจึงให้ผลเหมือนกัน
 *
 * `skipGlobalErrorToast` เพราะปุ่ม import แสดง error เองพร้อมรายละเอียดแถวที่ผิด
 */
export function useImportCoaFromCarmenGl() {
  return useApiMutation<void, { data: ChartOfAccountsImportResult }>({
    mutationFn: (_vars, buCode) =>
      httpClient.post(API_ENDPOINTS.CHART_OF_ACCOUNTS_IMPORT_CARMEN_GL(buCode)),
    invalidateKeys: [QUERY_KEYS.CHART_OF_ACCOUNTS],
    errorMessage: "Failed to import chart of accounts",
    meta: { skipGlobalErrorToast: true },
  });
}
