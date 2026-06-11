import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_NORMAL } from "@/lib/cache-config";
import type { PaginatedResponse, ParamsDto } from "@/types/params";
import type {
  VendorCertificate,
  CreateVendorCertificateDto,
} from "@/types/vendor-certificate";

const VENDOR_CERTIFICATE_KEYS = [QUERY_KEYS.VENDOR_CERTIFICATES];

/**
 * รายการใบรับรองของ vendor หนึ่งราย
 * GET `/api/config/{bu}/vendor-certificates/vendor/{vendorId}`
 *
 * @param vendorId - id ของ vendor (query disabled จนกว่าจะมีค่า)
 * @param params - พารามิเตอร์ pagination/search/filter
 */
export function useVendorCertificates(
  vendorId: string | undefined,
  params?: ParamsDto,
) {
  const buCode = useBuCode();
  return useQuery<PaginatedResponse<VendorCertificate>, ApiError>({
    queryKey: [QUERY_KEYS.VENDOR_CERTIFICATES, buCode, vendorId, params],
    queryFn: async () => {
      const url = buildUrl(
        API_ENDPOINTS.VENDOR_CERTIFICATES_BY_VENDOR(buCode!, vendorId!),
        params ?? {},
      );
      const res = await httpClient.get(url);
      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to load vendor certificates");
      }
      return res.json();
    },
    enabled: !!buCode && !!vendorId,
    ...CACHE_NORMAL,
  });
}

/**
 * ใบรับรอง vendor ตาม id
 * GET `/api/config/{bu}/vendor-certificates/{id}`
 *
 * @param id - id ของ vendor certificate
 */
export function useVendorCertificateById(id: string | undefined) {
  const buCode = useBuCode();
  return useQuery<VendorCertificate, ApiError>({
    queryKey: [QUERY_KEYS.VENDOR_CERTIFICATES, buCode, "detail", id],
    queryFn: async () => {
      const res = await httpClient.get(
        `${API_ENDPOINTS.VENDOR_CERTIFICATES(buCode!)}/${id}`,
      );
      if (!res.ok) {
        throw ApiError.fromResponse(res, "Failed to load vendor certificate");
      }
      const json = await res.json();
      return json.data;
    },
    enabled: !!buCode && !!id,
  });
}

/**
 * สร้างใบรับรองใต้ vendor
 * POST `/api/config/{bu}/vendor-certificates/vendor/{vendorId}` (vendor_id อยู่ใน URL)
 *
 * @returns mutation รับ `{ vendor_id, ...CreateVendorCertificateDto }`
 */
export function useCreateVendorCertificate() {
  return useApiMutation<CreateVendorCertificateDto & { vendor_id: string }>({
    mutationFn: ({ vendor_id, ...data }, buCode) =>
      httpClient.post(
        API_ENDPOINTS.VENDOR_CERTIFICATES_BY_VENDOR(buCode, vendor_id),
        data,
      ),
    invalidateKeys: VENDOR_CERTIFICATE_KEYS,
    errorMessage: "Failed to create vendor certificate",
  });
}

/**
 * แก้ไขใบรับรอง vendor
 * PATCH `/api/config/{bu}/vendor-certificates/{id}`
 *
 * @returns mutation รับ `{ id, ...CreateVendorCertificateDto }`
 */
export function useUpdateVendorCertificate() {
  return useApiMutation<CreateVendorCertificateDto & { id: string }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.patch(`${API_ENDPOINTS.VENDOR_CERTIFICATES(buCode)}/${id}`, data),
    invalidateKeys: VENDOR_CERTIFICATE_KEYS,
    errorMessage: "Failed to update vendor certificate",
  });
}

/**
 * ลบใบรับรอง vendor
 * DELETE `/api/config/{bu}/vendor-certificates/{id}`
 *
 * @returns mutation รับ id (string)
 */
export function useDeleteVendorCertificate() {
  return useApiMutation<string>({
    mutationFn: (id, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.VENDOR_CERTIFICATES(buCode)}/${id}`),
    invalidateKeys: VENDOR_CERTIFICATE_KEYS,
    errorMessage: "Failed to delete vendor certificate",
  });
}
