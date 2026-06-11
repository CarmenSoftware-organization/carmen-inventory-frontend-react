import { createConfigCrud } from "@/hooks/use-config-crud";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { DeliveryPoint, CreateDeliveryPointDto } from "@/types/delivery-point";

const crud = createConfigCrud<DeliveryPoint, CreateDeliveryPointDto>({
  queryKey: QUERY_KEYS.DELIVERY_POINTS,
  endpoint: API_ENDPOINTS.DELIVERY_POINTS,
  label: "delivery point",
});

/**
 * Hook ดึงรายการ delivery point แบบแบ่งหน้า
 *
 * Re-export จาก factory สำหรับ delivery point (จุดส่งสินค้า)
 * ใช้ใน `LookupDeliveryPoint` และหน้า config
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<DeliveryPoint>
 * @example
 * ```ts
 * const { data } = useDeliveryPoint({ perpage: -1 });
 * ```
 */
export const useDeliveryPoint = crud.useList;

/**
 * Hook สำหรับสร้าง delivery point ใหม่
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateDeliveryPoint().mutate({ code: "DP01", name: "Main Kitchen" });
 * ```
 */
export const useCreateDeliveryPoint = crud.useCreate;

/**
 * Hook สำหรับแก้ไข delivery point
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateDeliveryPoint().mutate({ id, code: "DP02", name: "Warehouse" });
 * ```
 */
export const useUpdateDeliveryPoint = crud.useUpdate;

/**
 * Hook สำหรับลบ delivery point
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteDeliveryPoint().mutate(dp.id);
 * ```
 */
export const useDeleteDeliveryPoint = crud.useDelete;
