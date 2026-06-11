import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createConfigCrud } from "@/hooks/use-config-crud";
import { useBuCode } from "@/hooks/use-bu-code";
import { ApiError } from "@/lib/api-error";
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

/**
 * Hook ดึงรายการสูตรอาหาร (recipe) แบบแบ่งหน้า
 *
 * @param params - พารามิเตอร์ pagination/search/filter
 * @param options - UseQueryOptions เพิ่มเติม
 * @returns UseQueryResult ของ PaginatedResponse<Recipe>
 * @example
 * ```ts
 * const { data } = useRecipe({ page: 1, perpage: 20 });
 * ```
 */
export const useRecipe = crud.useList;

/**
 * Hook ดึงสูตรอาหารตาม id
 *
 * @param id - id ของ recipe
 * @returns UseQueryResult ของ Recipe
 * @example
 * ```ts
 * const { data } = useRecipeById(params.id);
 * ```
 */
export const useRecipeById = crud.useById;

/**
 * Hook สำหรับลบสูตรอาหาร
 *
 * @returns UseMutationResult สำหรับลบ entity
 * @example
 * ```ts
 * useDeleteRecipe().mutate(r.id);
 * ```
 */
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

/** ส่ง multipart request ผ่าน proxy แล้ว normalize error เป็น ApiError (เหมือน useApiMutation) */
async function sendRecipeMultipart(
  url: string,
  method: "POST" | "PATCH",
  form: FormData,
  fallbackMessage: string,
): Promise<unknown> {
  const res = await fetch(url, { method, body: form });
  if (!res.ok) {
    let serverMessage: string | undefined;
    try {
      const err = await res.json();
      serverMessage = err.message;
    } catch {
      // JSON parse failed — use fallback
    }
    throw ApiError.fromResponse(res, serverMessage ?? fallbackMessage);
  }
  return res.json().catch(() => ({}));
}

/**
 * Hook สำหรับสร้างสูตรอาหารใหม่ (multipart: data + รูป gallery)
 *
 * ส่ง POST แบบ multipart/form-data ผ่าน proxy แล้ว invalidate list หลังสำเร็จ
 *
 * @returns UseMutationResult สำหรับสร้าง entity
 * @example
 * ```ts
 * useCreateRecipe().mutate({ code: "R01", name: "Pad Thai", images, gallery });
 * ```
 */
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

/**
 * Hook สำหรับแก้ไขสูตรอาหาร (multipart: data + full-sync gallery)
 *
 * ส่ง PATCH แบบ multipart/form-data ผ่าน proxy:
 * ส่ง `gallery` = full-sync รูปทั้งหมด · ไม่ส่ง gallery = คงรูปเดิม · `gallery: []` = ลบรูปทั้งหมด
 *
 * @returns UseMutationResult สำหรับอัพเดต entity
 * @example
 * ```ts
 * useUpdateRecipe().mutate({ id, code: "R02", name: "Tom Yum", images, gallery });
 * ```
 */
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
