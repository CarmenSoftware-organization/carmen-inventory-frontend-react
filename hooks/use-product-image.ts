import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_NORMAL } from "@/lib/cache-config";
import type {
  ProductImagesResponse,
  UpdateProductImageDto,
  UploadProductImagesDto,
} from "@/types/product-image";

const PRODUCT_IMAGE_KEYS = [QUERY_KEYS.PRODUCT_IMAGES];

/**
 * รายการรูปของ product หนึ่งราย (เรียงตาม sort_order)
 * GET `/api/config/{bu}/products/{productId}/images`
 *
 * @param productId - id ของ product (query disabled จนกว่าจะมีค่า)
 */
export function useProductImages(productId: string | undefined) {
  const buCode = useBuCode();
  return useQuery<ProductImagesResponse, ApiError>({
    queryKey: [QUERY_KEYS.PRODUCT_IMAGES, buCode, productId],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.PRODUCT_IMAGES(buCode!, productId!),
      );
      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to load product images");
      }
      return res.json();
    },
    enabled: !!buCode && !!productId,
    ...CACHE_NORMAL,
  });
}

/**
 * สร้าง multipart FormData สำหรับอัปโหลดรูป product
 * - `images` = ไฟล์ × N (1..10)
 * - `alt_texts` / `captions` = ค่าที่ match ตามตำแหน่ง index ของ images[]
 *
 * ห้ามตั้ง Content-Type เอง — ปล่อยให้ browser ใส่ boundary ของ multipart ให้อัตโนมัติ
 */
function buildProductImageFormData(data: UploadProductImagesDto): FormData {
  const form = new FormData();
  for (const file of data.images) form.append("images", file);
  for (const alt of data.alt_texts ?? []) form.append("alt_texts", alt);
  for (const caption of data.captions ?? []) form.append("captions", caption);
  return form;
}

/**
 * อัปโหลดรูปใต้ product (multipart/form-data)
 * POST `/api/config/{bu}/products/{productId}/images`
 *
 * @returns mutation รับ `{ product_id, images, alt_texts?, captions? }`
 */
export function useUploadProductImages() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();

  return useMutation<
    unknown,
    ApiError,
    UploadProductImagesDto & { product_id: string }
  >({
    mutationFn: async ({ product_id, ...data }) => {
      if (!buCode) throw new ApiError("MISSING_REQUIRED_FIELD", "Missing buCode");
      const res = await httpClient.post(
        API_ENDPOINTS.PRODUCT_IMAGES(buCode, product_id),
        buildProductImageFormData(data),
      );
      if (!res.ok) {
        let serverMessage: string | undefined;
        try {
          const err = await res.json();
          serverMessage = err.message;
        } catch {
          // JSON parse failed — use fallback
        }
        throw ApiError.fromResponse(
          res,
          serverMessage ?? "Failed to upload product images",
        );
      }
      return res.json().catch(() => ({}));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PRODUCT_IMAGE_KEYS });
    },
  });
}

/**
 * แก้ไขเมทาดาทาของรูป (alt_text/caption/is_primary)
 * PATCH `/api/config/{bu}/products/{productId}/images/{imageId}`
 *
 * @returns mutation รับ `{ product_id, imageId, ...UpdateProductImageDto }`
 */
export function useUpdateProductImage() {
  return useApiMutation<
    UpdateProductImageDto & { product_id: string; imageId: string }
  >({
    mutationFn: ({ product_id, imageId, ...data }, buCode) =>
      httpClient.patch(
        API_ENDPOINTS.PRODUCT_IMAGE(buCode, product_id, imageId),
        data,
      ),
    invalidateKeys: PRODUCT_IMAGE_KEYS,
    errorMessage: "Failed to update product image",
  });
}

/**
 * ลบรูปของ product
 * DELETE `/api/config/{bu}/products/{productId}/images/{imageId}`
 *
 * @returns mutation รับ `{ product_id, imageId }`
 */
export function useDeleteProductImage() {
  return useApiMutation<{ product_id: string; imageId: string }>({
    mutationFn: ({ product_id, imageId }, buCode) =>
      httpClient.delete(
        API_ENDPOINTS.PRODUCT_IMAGE(buCode, product_id, imageId),
      ),
    invalidateKeys: PRODUCT_IMAGE_KEYS,
    errorMessage: "Failed to delete product image",
  });
}

/**
 * จัดเรียงลำดับรูปใหม่
 * PUT `/api/config/{bu}/products/{productId}/images/order`
 * body `{ image_ids: string[] }` — ลำดับใน array = ลำดับใหม่
 *
 * @returns mutation รับ `{ product_id, image_ids }`
 */
export function useReorderProductImages() {
  return useApiMutation<{ product_id: string; image_ids: string[] }>({
    mutationFn: ({ product_id, image_ids }, buCode) =>
      httpClient.put(API_ENDPOINTS.PRODUCT_IMAGES_ORDER(buCode, product_id), {
        image_ids,
      }),
    invalidateKeys: PRODUCT_IMAGE_KEYS,
    errorMessage: "Failed to reorder product images",
  });
}
