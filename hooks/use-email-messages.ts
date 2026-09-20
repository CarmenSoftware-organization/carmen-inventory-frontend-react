import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import { parseEmailTemplatesValue } from "@/lib/email-template";

/**
 * อ่านคลังข้อความอีเมลสำหรับ dialog ส่งอีเมล (PO / RFP)
 *
 * คู่แฝดของ `useEmailSenders()` — ผูกกับ `configuration.app_config` ไม่ใช่
 * `configuration.email_template` ที่หน้าตั้งค่าใช้ ด้วยเหตุผลเดียวกัน
 *
 * ค่าที่ได้ผ่าน `parseEmailTemplatesValue` เสมอ เพราะคีย์นี้ backend รับแบบ passthrough
 * ไม่มี schema ฝั่ง server มาช่วยตรวจ · 404 = ยังไม่เคยตั้งค่า ไม่ใช่ข้อผิดพลาด
 */
export function useEmailMessages() {
  const buCode = useBuCode();
  const query = useQuery<unknown>({
    queryKey: [QUERY_KEYS.EMAIL_MESSAGES, buCode],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.EMAIL_MESSAGES(buCode!));
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch email messages");
      const json = await res.json();
      return json.data ?? null;
    },
    ...CACHE_STATIC,
    enabled: !!buCode,
  });

  const isNotFound =
    query.error instanceof ApiError && query.error.statusCode === 404;

  return {
    value: parseEmailTemplatesValue(query.data),
    isLoading: query.isPending && !isNotFound,
    isError: query.isError && !isNotFound,
  };
}
