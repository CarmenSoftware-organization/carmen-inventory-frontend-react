import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { Currency, CreateCurrencyDto } from "@/types/currency";

const crud = createConfigCrud<Currency, CreateCurrencyDto>({
  queryKey: QUERY_KEYS.CURRENCIES,
  endpoint: API_ENDPOINTS.CURRENCIES,
  label: "currency",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการสกุลเงิน (currency) แบบแบ่งหน้า
 *
 * Re-export จาก factory สำหรับ currency ใช้ใน LookupCurrency และหน้า config
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Currency>
 * @example
 * ```ts
 * const { data } = useCurrency({ perpage: -1 });
 * ```
 */
export const useCurrency = crud.useList;

/**
 * Hook สำหรับสร้างสกุลเงินใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateCurrency().mutate({ code: "THB", name: "Thai Baht" });
 * ```
 */
export const useCreateCurrency = crud.useCreate;

/**
 * Hook สำหรับแก้ไขสกุลเงิน
 *
 * ส่งเป็น PATCH invalidate list หลังสำเร็จ
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateCurrency().mutate({ id, code: "USD", name: "US Dollar" });
 * ```
 */
export const useUpdateCurrency = crud.useUpdate;

/**
 * Hook สำหรับลบสกุลเงิน
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteCurrency().mutate(currency.id);
 * ```
 */
export const useDeleteCurrency = crud.useDelete;
