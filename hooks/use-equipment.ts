import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  Equipment,
  CreateEquipmentDto,
  CreateEquipmentVars,
  UpdateEquipmentVars,
} from "@/types/equipment";

const crud = createConfigCrud<Equipment, CreateEquipmentDto>({
  queryKey: QUERY_KEYS.RECIPE_EQUIPMENT,
  endpoint: API_ENDPOINTS.RECIPE_EQUIPMENT,
  label: "equipment",
  updateMethod: "PATCH",
});

/**
 * Hook ดึงรายการอุปกรณ์ (equipment) ของ recipe module
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Equipment>
 * @example
 * ```ts
 * const { data } = useEquipment({ page: 1, perpage: 20 });
 * ```
 */
export const useEquipment = crud.useList;

/**
 * Hook ดึงข้อมูลอุปกรณ์ตาม id
 *
 * @param id - id ของอุปกรณ์
 * @returns UseQueryResult ของ Equipment
 * @example
 * ```ts
 * const { data } = useEquipmentById(params.id);
 * ```
 */
export const useEquipmentById = crud.useById;

/**
 * Hook สำหรับลบอุปกรณ์
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteEquipment().mutate(eq.id);
 * ```
 */
export const useDeleteEquipment = crud.useDelete;

/**
 * สร้าง multipart FormData สำหรับ equipment — part `metadata` (JSON) + `image` (ไฟล์ ถ้ามี)
 *
 * ห้ามตั้ง Content-Type เอง — ปล่อยให้ browser ใส่ boundary ของ multipart ให้อัตโนมัติ
 */
function buildEquipmentFormData(
  metadata: Record<string, unknown>,
  image?: File | null,
): FormData {
  const form = new FormData();
  form.append("metadata", JSON.stringify(metadata));
  if (image) form.append("image", image);
  return form;
}

/** ส่ง multipart request ผ่าน proxy แล้ว normalize error เป็น ApiError (เหมือน useApiMutation) */
async function sendEquipmentMultipart(
  url: string,
  method: "POST" | "PATCH",
  form: FormData,
  fallbackMessage: string,
): Promise<unknown> {
  const res =
    method === "POST"
      ? await httpClient.post(url, form)
      : await httpClient.patch(url, form);
  if (!res.ok) {
    let serverMessage: string | undefined;
    try {
      const err = await res.json();
      serverMessage = err.message;
    } catch {
      // JSON parse failed — use fallback
    }
    throw await ApiError.from(res, serverMessage ?? fallbackMessage);
  }
  return res.json().catch(() => ({}));
}

/**
 * Hook สำหรับสร้างอุปกรณ์ใหม่ (multipart: metadata + รูป)
 *
 * ส่ง POST แบบ multipart/form-data ผ่าน proxy แล้ว invalidate list หลังสำเร็จ
 * รูปไม่บังคับ — ถ้าไม่แนบจะสร้างอุปกรณ์โดยไม่มีรูป
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateEquipment().mutate({ code: "EQ01", name: "Oven", image: file });
 * ```
 */
export function useCreateEquipment() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, CreateEquipmentVars>({
    mutationFn: async ({ image, ...metadata }) => {
      if (!buCode)
        throw new ApiError("MISSING_REQUIRED_FIELD", "Missing buCode");
      return sendEquipmentMultipart(
        API_ENDPOINTS.RECIPE_EQUIPMENT(buCode),
        "POST",
        buildEquipmentFormData(metadata, image),
        "Failed to create equipment",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.RECIPE_EQUIPMENT],
      });
    },
  });
}

/**
 * Hook สำหรับแก้ไขอุปกรณ์ (multipart: metadata + รูป)
 *
 * ส่ง PATCH แบบ multipart/form-data ผ่าน proxy:
 * แนบ `image` = แทนรูปเดิม · `remove_image: true` (ไม่แนบรูป) = ลบรูป · ไม่ทำอะไร = คงรูปเดิม
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateEquipment().mutate({ id, code: "EQ02", name: "Mixer", image: file });
 * ```
 */
export function useUpdateEquipment() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, UpdateEquipmentVars>({
    mutationFn: async ({ id, image, ...metadata }) => {
      if (!buCode)
        throw new ApiError("MISSING_REQUIRED_FIELD", "Missing buCode");
      return sendEquipmentMultipart(
        `${API_ENDPOINTS.RECIPE_EQUIPMENT(buCode)}/${id}`,
        "PATCH",
        buildEquipmentFormData(metadata, image),
        "Failed to update equipment",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.RECIPE_EQUIPMENT],
      });
    },
  });
}
