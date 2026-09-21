import { useAppConfigByKey } from "@/hooks/use-app-config";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { ApiError } from "@/lib/api-error";
import { parseEmailTemplatesValue } from "@/lib/email-template";
import {
  EMAIL_TEMPLATES_CONFIG_KEY,
  type EmailTemplatesValue,
} from "@/types/email-template";

/**
 * อ่าน/เขียนคลังข้อความอีเมลของหน่วยธุรกิจ (app-config key `email_templates`)
 *
 * คีย์นี้ backend รับแบบ passthrough — ไม่มี schema ฝั่ง server มาช่วยตรวจ
 * (`app-config.service.ts` validate เฉพาะคีย์ที่รู้จัก) ค่าที่อ่านมาจึงผ่าน
 * `parseEmailTemplatesValue` เสมอ และ 404 = ยังไม่เคยตั้งค่า ไม่ใช่ข้อผิดพลาด
 *
 * ไม่มีความลับอยู่ในคีย์นี้ จึงไม่มีเรื่อง mask รหัสผ่านแบบ `use-email-profiles`
 */
export function useEmailTemplates() {
  const query = useAppConfigByKey(EMAIL_TEMPLATES_CONFIG_KEY);
  // ใช้ useApiMutation ตรงแทน useUpsertAppConfig ทั่วไป (คู่แฝดของเหตุผลใน
  // use-email-profiles.ts) — ต้อง invalidate ["email-messages", buCode] เพิ่ม เพราะ
  // useEmailMessages() (dialog ส่ง PO) อ่านคีย์ "email_templates" ก้อนเดียวกันนี้ผ่าน
  // hook/cache key คนละตัว (CACHE_STATIC = staleTime 30 นาที) ห้ามใส่ EMAIL_MESSAGES ลงใน
  // useUpsertAppConfig ตรง ๆ เพราะมันถูกใช้เขียน saved view ทุกครั้ง จะกลายเป็น refetch
  // ฟรีทั้งแอปทุกจุดที่เรียก ไม่ใช่แค่หน้านี้
  const upsert = useApiMutation<{ key: string; value: Record<string, unknown> }>({
    mutationFn: ({ key, value }, buCode) =>
      httpClient.put(API_ENDPOINTS.APP_CONFIG_BY_KEY(buCode, key), { value }),
    invalidateKeys: [QUERY_KEYS.APP_CONFIGS, QUERY_KEYS.EMAIL_MESSAGES],
    errorMessage: "Failed to save app config",
  });

  const isNotFound =
    query.error instanceof ApiError && query.error.statusCode === 404;

  return {
    value: parseEmailTemplatesValue(query.data?.value),
    isLoading: query.isPending && !isNotFound,
    isError: query.isError && !isNotFound,
    // เขียนกลับทั้งก้อนเสมอ (PUT ทับทั้ง value) — ไม่มี optimistic concurrency
    // ฝั่ง backend สองคนแก้พร้อมกันคือ last-write-wins เหมือน `email_profiles`
    save: (next: EmailTemplatesValue, opts?: { onSuccess?: () => void }) =>
      upsert.mutate(
        {
          key: EMAIL_TEMPLATES_CONFIG_KEY,
          value: next as unknown as Record<string, unknown>,
        },
        opts,
      ),
    isSaving: upsert.isPending,
  };
}
