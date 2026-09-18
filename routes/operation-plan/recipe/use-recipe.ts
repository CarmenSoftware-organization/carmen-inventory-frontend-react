import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { ApiError } from "@/lib/api-error";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type {
  Recipe,
  CreateRecipeDto,
  CreateRecipeVars,
  UpdateRecipeVars,
  RecipeGalleryManifestItem,
} from "@/types/recipe";

const crud = createConfigCrud<Recipe, CreateRecipeDto>({
  queryKey: QUERY_KEYS.RECIPES,
  endpoint: API_ENDPOINTS.RECIPES,
  label: "recipe",
});

export const useRecipe = crud.useList;

export const useRecipeById = crud.useById;

export const useDeleteRecipe = crud.useDelete;

/**
 * สร้าง multipart FormData สำหรับ recipe — part `data` (JSON) + `gallery` (manifest) + `images` (ไฟล์ × N)
 *
 * - `gallery` undefined → ไม่ส่ง field gallery/images = คงรูปเดิมทั้งหมด (แก้แต่ data)
 * - `gallery` = [] → ลบรูปทั้งหมด
 * - `gallery` มี items → full-sync ตามลำดับใน array (id ที่หายไปจะถูกลบ)
 *
 * ห้ามตั้ง Content-Type เอง — ปล่อยให้ browser ใส่ boundary ของ multipart ให้อัตโนมัติ
 */
function buildRecipeFormData(
  data: Record<string, unknown>,
  images?: File[],
  gallery?: RecipeGalleryManifestItem[],
): FormData {
  const form = new FormData();
  form.append("data", JSON.stringify(data));
  if (gallery !== undefined) {
    form.append("gallery", JSON.stringify(gallery));
    for (const file of images ?? []) form.append("images", file);
  }
  return form;
}

async function sendRecipeMultipart(
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

export function useCreateRecipe() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, CreateRecipeVars>({
    mutationFn: async ({ images, gallery, ...data }) => {
      if (!buCode)
        throw new ApiError("MISSING_REQUIRED_FIELD", "Missing buCode");
      return sendRecipeMultipart(
        API_ENDPOINTS.RECIPES(buCode),
        "POST",
        buildRecipeFormData(data, images, gallery),
        "Failed to create recipe",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECIPES] });
    },
  });
}

export function useUpdateRecipe() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();

  return useMutation<unknown, ApiError, UpdateRecipeVars>({
    mutationFn: async ({ id, images, gallery, ...data }) => {
      if (!buCode)
        throw new ApiError("MISSING_REQUIRED_FIELD", "Missing buCode");
      return sendRecipeMultipart(
        `${API_ENDPOINTS.RECIPES(buCode)}/${id}`,
        "PATCH",
        buildRecipeFormData(data, images, gallery),
        "Failed to update recipe",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.RECIPES] });
    },
  });
}
