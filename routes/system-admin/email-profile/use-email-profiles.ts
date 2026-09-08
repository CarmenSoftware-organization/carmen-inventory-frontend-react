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

export function useEmailProfiles() {
  const query = useAppConfigByKey(EMAIL_PROFILES_CONFIG_KEY);
  const upsert = useUpsertAppConfig();
  const test = useApiMutation<{ profile_id: string }>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.APP_CONFIG_TEST_EMAIL_PROFILE(buCode), data),
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
    // เขียนกลับทั้งก้อนเสมอ และคงลำดับ profiles ไว้ — backend คืนค่ารหัสผ่านเดิม
    // โดยจับคู่ตามลำดับที่อ่านได้ ถ้าเรียงใหม่หรือกรองทิ้ง รหัสผ่านจะสลับโปรไฟล์
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
