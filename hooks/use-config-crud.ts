import {
  useQuery,
  type UseQueryResult,
  type UseMutationResult,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { createConfigApi } from "@/lib/config-crud";
import { CACHE_STATIC, type CacheProfile } from "@/lib/cache-config";
import type { ParamsDto, PaginatedResponse } from "@/types/params";

interface ConfigCrudOptions {
  queryKey: string;
  endpoint: (buCode: string) => string;
  label: string;
  updateMethod?: "PUT" | "PATCH";
  /**
   * Cache profile สำหรับ useList/useById — default `CACHE_STATIC` (30 นาที)
   * ตั้งเป็น `CACHE_NORMAL` (vendor/product) หรือ `CACHE_DYNAMIC` (transactional)
   * ตามความถี่ที่ข้อมูลเปลี่ยน caller ยัง override per-call ผ่าน `options` ของ useList ได้
   */
  cacheProfile?: CacheProfile;
}

/**
 * Factory สร้างชุด hook CRUD มาตรฐานสำหรับ config module (list/byId/create/update/delete)
 *
 * ลดการเขียน boilerplate ของ config hooks ทุก module ให้เหลือเพียงไม่กี่บรรทัด
 * โดยใช้ `createConfigApi` สร้าง API function + `useApiMutation` ห่อ mutation
 * ค่าเริ่มต้น `updateMethod` = `"PUT"`; ใช้ `"PATCH"` ได้เมื่อ backend รองรับ
 * ทุก hook อ่าน buCode ผ่าน `useBuCode()` และ guard ด้วย enabled อัตโนมัติ
 *
 * @param options - ตัวเลือก queryKey, endpoint, label และ updateMethod
 * @returns object ของ hook useList/useById/useCreate/useUpdate/useDelete
 * @example
 * ```ts
 * const crud = createConfigCrud<Currency, CreateCurrencyDto>({
 *   queryKey: QUERY_KEYS.CURRENCIES,
 *   endpoint: API_ENDPOINTS.CURRENCIES,
 *   label: "currency",
 * });
 * export const useCurrency = crud.useList;
 * export const useCreateCurrency = crud.useCreate;
 * ```
 */
export function createConfigCrud<T, TCreate>({
  queryKey,
  endpoint,
  label,
  updateMethod = "PUT",
  cacheProfile = CACHE_STATIC,
}: ConfigCrudOptions): {
  useList: (
    params?: ParamsDto,
    options?: Omit<UseQueryOptions<PaginatedResponse<T>>, "queryKey" | "queryFn">,
  ) => UseQueryResult<PaginatedResponse<T>>;
  useById: (id: string | undefined) => UseQueryResult<T>;
  useCreate: () => UseMutationResult<unknown, Error, TCreate>;
  useUpdate: () => UseMutationResult<unknown, Error, TCreate & { id: string }>;
  useDelete: () => UseMutationResult<unknown, Error, string>;
} {
  const api = createConfigApi<T, TCreate>({ endpoint, label, updateMethod });

  /**
   * Hook ดึงรายการ config entity แบบแบ่งหน้า
   *
   * ใช้ cache profile จาก `cacheProfile` (default `CACHE_STATIC` 30 นาที)
   * queryKey ประกอบด้วย [queryKey, buCode, params] เพื่อแยก cache ต่อ BU/param
   * enabled จะเป็น false จนกว่า buCode จะพร้อม
   *
   * @param params - พารามิเตอร์ pagination/search/filter
   * @param options - ตัวเลือก UseQueryOptions เพิ่มเติม
   * @returns UseQueryResult ของ PaginatedResponse
   * @example
   * ```ts
   * const { data, isLoading } = useCurrency({ page: 1, perpage: 20 });
   * ```
   */
  function useList(
    params?: ParamsDto,
    options?: Omit<UseQueryOptions<PaginatedResponse<T>>, "queryKey" | "queryFn">,
  ) {
    const buCode = useBuCode();

    return useQuery<PaginatedResponse<T>>({
      queryKey: [queryKey, buCode, params],
      queryFn: () => api.getList(buCode!, params),
      ...cacheProfile,
      ...options,
      enabled: (options?.enabled ?? true) && !!buCode,
    });
  }

  /**
   * Hook ดึง config entity ตาม id
   *
   * ใช้สำหรับหน้า edit page แบบ page-based ที่ต้องโหลดข้อมูลเดิมก่อนแก้ไข
   * enabled เป็น false เมื่อ id หรือ buCode ยังไม่พร้อม
   *
   * @param id - id ของ entity
   * @returns UseQueryResult ของ entity
   * @example
   * ```ts
   * const { data } = useCurrencyById(params.id);
   * ```
   */
  function useById(id: string | undefined) {
    const buCode = useBuCode();

    return useQuery<T>({
      queryKey: [queryKey, buCode, id],
      queryFn: () => api.getById(buCode!, id!),
      enabled: !!buCode && !!id,
      ...cacheProfile,
    });
  }

  /**
   * Hook สำหรับสร้าง config entity ใหม่
   *
   * invalidate queryKey ของ list โดยอัตโนมัติหลังสร้างสำเร็จ
   * error ถูก normalize เป็น `ApiError` ผ่าน `useApiMutation`
   *
   * @returns UseMutationResult สำหรับสร้าง entity
   * @example
   * ```ts
   * const create = useCreateCurrency();
   * create.mutate({ code: "THB", name: "Thai Baht" });
   * ```
   */
  function useCreate() {
    return useApiMutation<TCreate>({
      mutationFn: (data, buCode) => api.create(buCode, data),
      invalidateKeys: [queryKey],
      errorMessage: `Failed to create ${label}`,
    });
  }

  /**
   * Hook สำหรับแก้ไข config entity
   *
   * รับ payload `{ id, ...data }` แล้วส่งเป็น PUT/PATCH ตาม `updateMethod`
   * invalidate list หลังสำเร็จ
   *
   * @returns UseMutationResult สำหรับอัพเดต entity
   * @example
   * ```ts
   * const update = useUpdateCurrency();
   * update.mutate({ id, code: "USD", name: "US Dollar" });
   * ```
   */
  function useUpdate() {
    return useApiMutation<TCreate & { id: string }>({
      mutationFn: ({ id, ...data }, buCode) =>
        api.update(buCode, id, data as TCreate),
      invalidateKeys: [queryKey],
      errorMessage: `Failed to update ${label}`,
    });
  }

  /**
   * Hook สำหรับลบ config entity ตาม id
   *
   * รับ id เป็น string เรียก DELETE แล้ว invalidate list
   * ใช้ร่วมกับ `DeleteDialog` + `isPending`
   *
   * @returns UseMutationResult สำหรับลบ entity
   * @example
   * ```ts
   * const del = useDeleteCurrency();
   * del.mutate(currency.id);
   * ```
   */
  function useDelete() {
    return useApiMutation<string>({
      mutationFn: (id, buCode) => api.remove(buCode, id),
      invalidateKeys: [queryKey],
      errorMessage: `Failed to delete ${label}`,
    });
  }

  return { useList, useById, useCreate, useUpdate, useDelete };
}
