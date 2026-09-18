import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import { httpClient } from "@/lib/http-client";

export interface BackendVersion {
  /** เวอร์ชันของ gateway ที่รันอยู่ เช่น `3.0.0-build.20260918.808270486` */
  version: string;
  /** git commit สั้นของบิลด์ หรือ `unknown` เมื่อรันจากอิมเมจที่ไม่มี git */
  commit: string;
}

/**
 * Hook อ่านเวอร์ชันของ backend gateway ที่กำลังให้บริการอยู่
 *
 * ยิง `GET /version` ของ gateway (root ไม่ใช่ `/api/...`) ซึ่งเป็น endpoint
 * สาธารณะเหมือน `/health` — ไม่ต้อง auth ไม่ผูก BU จึงเรียกได้ตั้งแต่ก่อนมี
 * profile และไม่ต้องเติม app-id allowlist
 *
 * ค่าจะเปลี่ยนก็ต่อเมื่อ backend ถูก deploy ใหม่ จึง cache แบบ `CACHE_STATIC`
 * และปิด refetch ตอนสลับแท็บ — แถบสถานะเป็นข้อมูลอ้างอิงสำหรับแจ้งปัญหา
 * ไม่ใช่ตัวเฝ้าดู deploy แบบเรียลไทม์
 *
 * **fail-soft**: ถ้า backend ยังไม่ได้ deploy รุ่นที่มี `/version` จะได้ 404
 * hook คืน `undefined` แล้วแถบสถานะซ่อนส่วนนี้ไปเงียบ ๆ จึงเอา frontend ขึ้น
 * ก่อน backend ได้โดยไม่พัง (แค่ไม่เห็นเวอร์ชัน backend)
 *
 * @returns UseQueryResult ของ `BackendVersion`
 * @example
 * ```ts
 * const { data } = useBackendVersion();
 * <span>api {data?.version}</span>
 * ```
 */
export function useBackendVersion() {
  return useQuery<BackendVersion>({
    queryKey: [QUERY_KEYS.BACKEND_VERSION],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.BACKEND_VERSION);
      if (!res.ok) throw new Error("Failed to fetch backend version");
      return res.json();
    },
    ...CACHE_STATIC,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
