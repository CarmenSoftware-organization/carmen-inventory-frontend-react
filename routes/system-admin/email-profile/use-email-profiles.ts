import { useAppConfigByKey, useUpsertAppConfig } from "@/hooks/use-app-config";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { ApiError } from "@/lib/api-error";
import {
  EMAIL_PROFILES_CONFIG_KEY,
  type EmailProfilesValue,
} from "@/types/email-profile";

const EMPTY: EmailProfilesValue = { default_profile_id: null, profiles: [] };

/**
 * ผลลัพธ์จริงของ `test-email-profile` — **HTTP 200 ไม่ได้แปลว่าส่งสำเร็จ** ต้องอ่าน
 * `sent`/`error` เสมอ ไม่ใช่แค่เช็คว่า request ไม่ throw (แก้ Minor จากรีวิว C1: เดิม
 * `testProfile` ไม่ได้ระบุ generic ของ response ทำให้ `.data` ไม่มี type)
 */
export interface TestEmailProfileResult {
  sent: boolean;
  recipient?: string;
  error?: string;
}

export function useEmailProfiles() {
  const query = useAppConfigByKey(EMAIL_PROFILES_CONFIG_KEY);
  const upsert = useUpsertAppConfig();
  const test = useApiMutation<{ profile_id: string }, TestEmailProfileResult>({
    mutationFn: (data, buCode) =>
      httpClient.post(
        API_ENDPOINTS.APP_CONFIG_TEST_EMAIL_PROFILE(buCode),
        data,
      ),
    invalidateKeys: [],
    errorMessage: "Test email failed",
  });

  const isNotFound =
    query.error instanceof ApiError && query.error.statusCode === 404;
  const value = (query.data?.value as EmailProfilesValue | undefined) ?? EMPTY;

  return {
    value,
    isLoading: query.isPending && !isNotFound,
    isError: query.isError && !isNotFound,
    // เขียนกลับทั้งก้อนเสมอ (PUT ทับทั้ง value ไม่ใช่ partial update) — backend จับคู่
    // รหัสผ่านที่เก็บไว้ด้วย `id` ของโปรไฟล์ (ไม่ใช่ตามตำแหน่งใน array อีกต่อไป หลัง Task B1
    // แก้เป็น id-based ใน commit 49162675a) โปรไฟล์ที่ถือค่า mask แต่ `id` ไม่ตรงกับของที่
    // เก็บไว้ backend จะ throw — โปรไฟล์ใหม่จึงต้องมีรหัสผ่านจริงเสมอ ห้ามส่ง mask
    save: (next: EmailProfilesValue, opts?: { onSuccess?: () => void }) =>
      upsert.mutate(
        {
          key: EMAIL_PROFILES_CONFIG_KEY,
          value: next as unknown as Record<string, unknown>,
        },
        opts,
      ),
    isSaving: upsert.isPending,
    testProfile: test.mutate,
    isTesting: test.isPending,
  };
}
