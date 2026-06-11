import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { CreditTerm, CreateCreditTermDto } from "@/types/credit-term";

const crud = createConfigCrud<CreditTerm, CreateCreditTermDto>({
  queryKey: QUERY_KEYS.CREDIT_TERMS,
  endpoint: API_ENDPOINTS.CREDIT_TERMS,
  label: "credit term",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการ credit term แบบแบ่งหน้า
 *
 * Re-export จาก factory สำหรับ credit term (เงื่อนไขการชำระเงิน)
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<CreditTerm>
 * @example
 * ```ts
 * const { data } = useCreditTerm({ page: 1, perpage: 20 });
 * ```
 */
export const useCreditTerm = crud.useList;

/**
 * Hook ดึง credit term ตาม id
 *
 * @param id - id ของ credit term
 * @returns UseQueryResult ของ CreditTerm
 * @example
 * ```ts
 * const { data } = useCreditTermById(params.id);
 * ```
 */
export const useCreditTermById = crud.useById;

/**
 * Hook สำหรับสร้าง credit term ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateCreditTerm().mutate({ code: "NET30", name: "Net 30", day: 30 });
 * ```
 */
export const useCreateCreditTerm = crud.useCreate;

/**
 * Hook สำหรับแก้ไข credit term
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateCreditTerm().mutate({ id, code: "NET60", day: 60 });
 * ```
 */
export const useUpdateCreditTerm = crud.useUpdate;

/**
 * Hook สำหรับลบ credit term
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteCreditTerm().mutate(term.id);
 * ```
 */
export const useDeleteCreditTerm = crud.useDelete;
