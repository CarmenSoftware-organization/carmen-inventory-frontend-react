import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";

/** โปรไฟล์ผู้ส่งเท่าที่ dialog ส่งอีเมลต้องใช้ — ไม่มี smtp โดยตั้งใจ */
export interface EmailSender {
  id: string;
  name: string;
  enabled: boolean;
  from_email: string;
  from_name: string;
}

export interface EmailSendersValue {
  default_profile_id: string | null;
  profiles: EmailSender[];
}

const EMPTY: EmailSendersValue = { default_profile_id: null, profiles: [] };

/**
 * อ่านรายชื่อผู้ส่งสำหรับ dialog ส่งอีเมล (PO / RFP)
 *
 * ต่างจาก `useEmailProfiles()` ที่หน้าตั้งค่าใช้: เส้นนี้ผูกกับ `configuration.app_config`
 * ซึ่งทุก BU มี ส่วนหน้าตั้งค่าผูกกับ `configuration.email_profile` ที่ขายแยก — BU ที่ซื้อ
 * Procurement แต่ไม่ได้ซื้อ Email Profile จึงยังส่งอีเมลได้ แค่แก้โปรไฟล์ไม่ได้
 *
 * 404 = BU นี้ยังไม่เคยตั้งโปรไฟล์ ไม่ใช่ข้อผิดพลาด
 */
export function useEmailSenders() {
  const buCode = useBuCode();
  const query = useQuery<EmailSendersValue>({
    queryKey: [QUERY_KEYS.EMAIL_SENDERS, buCode],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.EMAIL_SENDERS(buCode!));
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch email senders");
      const json = await res.json();
      return (json.data as EmailSendersValue | null) ?? EMPTY;
    },
    ...CACHE_STATIC,
    enabled: !!buCode,
  });

  const isNotFound =
    query.error instanceof ApiError && query.error.statusCode === 404;

  return {
    value: query.data ?? EMPTY,
    isLoading: query.isPending && !isNotFound,
    isError: query.isError && !isNotFound,
  };
}
