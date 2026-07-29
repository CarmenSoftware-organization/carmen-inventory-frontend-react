import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import type { AppConfig } from "@/types/app-config";

/**
 * Config ต่อ user ปัจจุบัน (tb_application_user_config) — key เดียว
 * ไม่เคยบันทึกจะได้ default { views: [] } จาก backend (ไม่ 404)
 *
 * Fetch มาตรฐานรายตัว แยกออกมาจาก hook เพื่อให้ `useListViews` เรียกซ้ำผ่าน
 * `queryClient.fetchQuery` แบบ force-fresh ก่อนเขียนทับได้ โดยไม่ต้อง copy logic
 * (ดู "BU-view lost-update window" ที่ `hooks/use-list-views.ts`)
 */
export async function fetchAppUserConfigByKey(
  buCode: string,
  key: string,
): Promise<AppConfig> {
  const res = await httpClient.get(
    API_ENDPOINTS.APP_USER_CONFIG_BY_KEY(buCode, key),
  );
  if (!res.ok) throw await ApiError.from(res, "Failed to fetch app user config");
  const json = await res.json();
  return json.data;
}

export function useAppUserConfigByKey(key: string | undefined) {
  const buCode = useBuCode();
  return useQuery<AppConfig>({
    queryKey: [QUERY_KEYS.APP_USER_CONFIGS, buCode, key],
    queryFn: () => fetchAppUserConfigByKey(buCode!, key!),
    ...CACHE_STATIC,
    enabled: !!buCode && !!key,
  });
}

export function useUpsertAppUserConfig() {
  return useApiMutation<{ key: string; value: Record<string, unknown> }>({
    mutationFn: ({ key, value }, buCode) =>
      httpClient.put(API_ENDPOINTS.APP_USER_CONFIG_BY_KEY(buCode, key), { value }),
    invalidateKeys: [QUERY_KEYS.APP_USER_CONFIGS],
    errorMessage: "Failed to save app user config",
  });
}
