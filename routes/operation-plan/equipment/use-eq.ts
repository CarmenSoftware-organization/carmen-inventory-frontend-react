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

export const useEquipment = crud.useList;

export const useEquipmentById = crud.useById;

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
