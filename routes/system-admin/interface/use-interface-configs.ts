import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { fetchAppConfigByKey } from "@/hooks/use-app-config";
import { ApiError } from "@/lib/api-error";
import { QUERY_KEYS } from "@/constant/query-keys";
import { CACHE_STATIC } from "@/lib/cache-config";
import type { AppConfig } from "@/types/app-config";
import { INTERFACE_CATEGORIES } from "./interface-registry";

/** config key ของทุก brand — คงที่ตลอดอายุแอป จึงคำนวณครั้งเดียวนอก component */
const CONFIG_KEYS: readonly string[] = INTERFACE_CATEGORIES.flatMap((c) =>
  c.brands.map((b) => b.configKey),
);

/**
 * อ่าน app-config ของทุก interface แบบรายคีย์
 *
 * ใช้แทน `useAppConfigs()` เพราะ list endpoint (`GET /app-config`) ผูกกับ
 * `configuration.app_config` ไม่ใช่ `interface` และตั้งแต่ 2026-09-20 มันไม่คืนคีย์
 * `interface_*` อีกแล้ว (gateway กรองออก) การยิงรายคีย์จึงเป็นทางเดียวที่เหลือ และ
 * ตรงกับ license ที่หน้านี้ถืออยู่จริง
 *
 * 404 = ยังไม่เคยตั้งค่า ไม่ใช่ข้อผิดพลาด — คืนเป็น "ไม่มีแถว" เหมือนที่ list เคยทำ
 */
export function useInterfaceConfigs() {
  const buCode = useBuCode();
  const queryClient = useQueryClient();
  const results = useQueries({
    queries: CONFIG_KEYS.map((key) => ({
      queryKey: [QUERY_KEYS.APP_CONFIGS, buCode, key],
      queryFn: async (): Promise<AppConfig | null> => {
        try {
          return await fetchAppConfigByKey(buCode!, key);
        } catch (error) {
          if (error instanceof ApiError && error.statusCode === 404) return null;
          throw error;
        }
      },
      ...CACHE_STATIC,
      enabled: !!buCode,
    })),
  });

  return {
    data: results
      .map((r) => r.data)
      .filter((row): row is AppConfig => row != null),
    isLoading: results.some((r) => r.isPending),
    isError: results.some((r) => r.isError),
    refetch: () => {
      void queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.APP_CONFIGS, buCode],
      });
    },
  };
}
