import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import type { DocumentFile } from "@/types/document";
import type { PaginatedResponse, ParamsDto } from "@/types/params";
import { CACHE_DYNAMIC } from "@/lib/cache-config";

/**
 * Hook ดึงรายการไฟล์เอกสารแบบแบ่งหน้าตาม buCode
 * ใช้ CACHE_DYNAMIC (staleTime 1 นาที) เพราะไฟล์อัปโหลด/ลบบ่อย
 * จะไม่ fetch ถ้า buCode ยังไม่พร้อม
 * @param params - พารามิเตอร์ pagination/filter/search
 * @param options - ตัวเลือก enabled เพื่อควบคุมการ fetch
 * @returns UseQueryResult ของ PaginatedResponse<DocumentFile>
 * @example
 * const { data } = useDocument({ page: 1, perpage: 20 });
 */
export function useDocument(
  params?: ParamsDto,
  options?: { enabled?: boolean },
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<DocumentFile>>({
    queryKey: [QUERY_KEYS.DOCUMENTS, buCode, params],
    queryFn: async () => {
      if (!buCode) throw new Error("Missing buCode");
      const url = buildUrl(API_ENDPOINTS.DOCUMENTS(buCode), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    ...CACHE_DYNAMIC,
    enabled: !!buCode && (options?.enabled ?? true),
  });
}

/**
 * Hook สำหรับอัปโหลดไฟล์เอกสารผ่าน multipart/form-data
 * ใช้ fetch โดยตรงเพราะต้อง bypass http-client JSON serializer
 * หลัง success จะ invalidate QUERY_KEYS.DOCUMENTS เพื่อ refresh รายการ
 * @returns UseMutationResult รับ File
 * @example
 * const upload = useUploadDocument();
 * upload.mutate(fileInput.files[0]);
 */
export function useUploadDocument() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, File>({
    mutationFn: async (file) => {
      if (!buCode) throw new Error("Missing buCode");
      const formData = new FormData();
      formData.append("file", file);
      const res = await httpClient.post(
        `${API_ENDPOINTS.DOCUMENTS(buCode)}/upload`,
        formData,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to upload document");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DOCUMENTS] });
    },
  });
}

/**
 * Hook สำหรับลบไฟล์เอกสารตาม fileToken (รองรับ token ที่มี buCode prefix เช่น "T02/uuid")
 * จะ strip prefix ออกก่อนส่ง request เพราะ endpoint มี buCode อยู่แล้ว
 * @returns UseMutationResult รับ fileToken (string)
 * @example
 * const del = useDeleteDocument();
 * del.mutate("T02/abc-123");
 */
export function useDeleteDocument() {
  const buCode = useBuCode();

  return useApiMutation<string>({
    mutationFn: (fileToken) => {
      // fileToken อาจมี buCode prefix เช่น "T02/uuid" — ตัดออกเพราะ endpoint มี buCode อยู่แล้ว
      const id = fileToken.includes("/") ? fileToken.split("/").pop()! : fileToken;
      return httpClient.delete(`${API_ENDPOINTS.DOCUMENTS(buCode!)}/${id}`);
    },
    invalidateKeys: [QUERY_KEYS.DOCUMENTS],
    errorMessage: "Failed to delete document",
  });
}
