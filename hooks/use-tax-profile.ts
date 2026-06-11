import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { TaxProfile, CreateTaxProfileDto } from "@/types/tax-profile";

const crud = createConfigCrud<TaxProfile, CreateTaxProfileDto>({
  queryKey: QUERY_KEYS.TAX_PROFILES,
  endpoint: API_ENDPOINTS.TAX_PROFILES,
  label: "tax profile",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการ tax profile แบบแบ่งหน้า
 *
 * Re-export จาก factory ใช้ใน `LookupTaxProfile` และหน้า PR/PO สำหรับระบุ tax
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<TaxProfile>
 * @example
 * ```ts
 * const { data } = useTaxProfile({ perpage: -1 });
 * ```
 */
export const useTaxProfile = crud.useList;

/**
 * Hook สำหรับสร้าง tax profile ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateTaxProfile().mutate({ code: "VAT7", name: "VAT 7%", rate: 7 });
 * ```
 */
export const useCreateTaxProfile = crud.useCreate;

/**
 * Hook สำหรับแก้ไข tax profile
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateTaxProfile().mutate({ id, code: "VAT10", rate: 10 });
 * ```
 */
export const useUpdateTaxProfile = crud.useUpdate;

/**
 * Hook สำหรับลบ tax profile
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteTaxProfile().mutate(tp.id);
 * ```
 */
export const useDeleteTaxProfile = crud.useDelete;
