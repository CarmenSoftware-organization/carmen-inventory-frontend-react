import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { buildUrl } from "@/lib/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_NORMAL } from "@/lib/cache-config";
import type { PaginatedResponse, ParamsDto } from "@/types/params";
import type {
  ProductEcoLabel,
  CreateProductEcoLabelDto,
} from "@/types/product-eco-label";

const PRODUCT_ECO_LABEL_KEYS = [QUERY_KEYS.PRODUCT_ECO_LABELS];

export function useProductEcoLabels(
  productId: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();
  return useQuery<PaginatedResponse<ProductEcoLabel>, ApiError>({
    queryKey: [QUERY_KEYS.PRODUCT_ECO_LABELS, buCode, productId, params],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.PRODUCT_ECO_LABELS_BY_PRODUCT(buCode!, productId!),
        params ?? {},
      );
      const res = await httpClient.get(url);
      if (!res.ok) {
        throw await ApiError.from(res, "Failed to load product eco labels");
      }
      return res.json();
    },
    enabled: !!buCode && !!productId,
    ...CACHE_NORMAL,
  });
}

export function useCreateProductEcoLabel() {
  return useApiMutation<CreateProductEcoLabelDto & { product_id: string }>({
    mutationFn: ({ product_id, ...data }, buCode) =>
      httpClient.post(
        API_ENDPOINTS.PRODUCT_ECO_LABELS_BY_PRODUCT(buCode, product_id),
        data,
      ),
    invalidateKeys: PRODUCT_ECO_LABEL_KEYS,
    errorMessage: "Failed to create product eco label",
  });
}

export function useUpdateProductEcoLabel() {
  return useApiMutation<
    CreateProductEcoLabelDto & { id: string; doc_version?: number }
  >({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.PRODUCT_ECO_LABELS(buCode)}/${id}`,
        data,
      ),
    invalidateKeys: PRODUCT_ECO_LABEL_KEYS,
    errorMessage: "Failed to update product eco label",
  });
}

export function useDeleteProductEcoLabel() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.PRODUCT_ECO_LABELS(buCode)}/${id}`),
    invalidateKeys: PRODUCT_ECO_LABEL_KEYS,
    errorMessage: "Failed to delete product eco label",
  });
}
