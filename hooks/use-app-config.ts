import { useQuery } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { ApiError } from "@/lib/api-error";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import type { AppConfig } from "@/types/app-config";

export function useAppConfigByKey(key: string | undefined) {
  const buCode = useBuCode();
  return useQuery<AppConfig>({
    queryKey: [QUERY_KEYS.APP_CONFIGS, buCode, key],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.APP_CONFIG_BY_KEY(buCode!, key!),
      );
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch app config");
      const json = await res.json();
      return json.data;
    },
    ...CACHE_STATIC,
    enabled: !!buCode && !!key,
  });
}

/**
 * Hook ดึง app config ทั้งหมดของ business unit ปัจจุบัน
 *
 * ใช้ในหน้า list ที่ต้องรู้สถานะของหลาย key พร้อมกัน (เช่น interface list ที่โชว์
 * badge enabled/disabled ต่อ interface) แทนการยิง `useAppConfigByKey` ทีละ key
 *
 * @returns query ที่คืน `AppConfig[]`
 */
export function useAppConfigs() {
  const buCode = useBuCode();
  return useQuery<AppConfig[]>({
    queryKey: [QUERY_KEYS.APP_CONFIGS, buCode],
    queryFn: async () => {
      const res = await httpClient.get(API_ENDPOINTS.APP_CONFIGS(buCode!));
      if (!res.ok) throw await ApiError.from(res, "Failed to fetch app configs");
      const json = await res.json();
      // list endpoint wraps rows as `data: { items, count }` (unlike the single-key
      // GET, whose `data` IS the row) — the array lives at `data.items`
      return json.data?.items ?? [];
    },
    ...CACHE_STATIC,
    enabled: !!buCode,
  });
}

export function useUpsertAppConfig() {
  return useApiMutation<{ key: string; value: Record<string, unknown> }>({
    mutationFn: ({ key, value }, buCode) =>
      httpClient.put(API_ENDPOINTS.APP_CONFIG_BY_KEY(buCode, key), { value }),
    invalidateKeys: [QUERY_KEYS.APP_CONFIGS],
    errorMessage: "Failed to save app config",
  });
}

export function useTestEmail() {
  return useApiMutation<void>({
    mutationFn: (_data, buCode) =>
      httpClient.post(API_ENDPOINTS.APP_CONFIG_TEST_EMAIL(buCode)),
    invalidateKeys: [],
    errorMessage: "Test email failed",
  });
}

export interface SignatureCandidate {
  user_id: string;
  firstname: string;
  middlename: string;
  lastname: string;
  email: string;
  department: { id?: string; name?: string } | null;
}

export function useSignatureCandidates(docType: string | undefined) {
  const buCode = useBuCode();
  return useQuery<SignatureCandidate[]>({
    queryKey: [QUERY_KEYS.APP_CONFIGS, buCode, "signature-candidates", docType],
    queryFn: async () => {
      const res = await httpClient.get(
        API_ENDPOINTS.APP_CONFIG_SIGNATURE_CANDIDATES(buCode!, docType!),
      );
      if (!res.ok)
        throw await ApiError.from(res, "Failed to fetch signature candidates");
      const json = await res.json();
      return (json.data?.candidates ?? []) as SignatureCandidate[];
    },
    ...CACHE_STATIC,
    enabled: !!buCode && !!docType,
  });
}
