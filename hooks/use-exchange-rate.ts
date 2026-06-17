import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useBuCode } from "@/hooks/use-bu-code";
import { useApiMutation } from "@/hooks/use-api-mutation";
import { httpClient } from "@/lib/http-client";
import { buildUrl } from "@/utils/build-query-string";
import { QUERY_KEYS } from "@/constant/query-keys";
import { API_ENDPOINTS } from "@/constant/api-endpoints";
import type { ExchangeRateItem, ExchangeRateDto } from "@/types/exchange-rate";
import type { ParamsDto, PaginatedResponse } from "@/types/params";
import { CACHE_NORMAL } from "@/lib/cache-config";

interface ExternalRateResponse {
  result: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  time_last_update_utc: string;
}

/**
 * Hook ดึงรายการอัตราแลกเปลี่ยนตาม business unit แบบแบ่งหน้า
 * ใช้ CACHE_NORMAL (staleTime 5 นาที) เพราะอัตราแลกเปลี่ยนอัปเดตเป็นรายวัน
 * @param params - พารามิเตอร์สำหรับ filter/pagination
 * @param options - ตัวเลือกเพิ่มเติมของ useQuery (ไม่รวม queryKey/queryFn)
 * @returns UseQueryResult ของ PaginatedResponse<ExchangeRateItem>
 * @example
 * const { data } = useExchangeRateQuery({ page: 1, perpage: 50 });
 */
export function useExchangeRateQuery(
  params?: ParamsDto,
  options?: Omit<UseQueryOptions<PaginatedResponse<ExchangeRateItem>>, "queryKey" | "queryFn">,
) {
  const buCode = useBuCode();

  return useQuery<PaginatedResponse<ExchangeRateItem>>({
    queryKey: [QUERY_KEYS.EXCHANGE_RATES, buCode, params],
    queryFn: async () => {
      const url = buildUrl(API_ENDPOINTS.EXCHANGE_RATES(buCode!), params);
      const res = await httpClient.get(url);
      if (!res.ok) throw new Error("Failed to fetch exchange rates");
      return res.json();
    },
    ...CACHE_NORMAL,
    ...options,
    enabled: (options?.enabled ?? true) && !!buCode,
  });
}

/**
 * Hook สำหรับอัปเดตอัตราแลกเปลี่ยนแบบหลายรายการพร้อมกัน (bulk POST)
 * Invalidate ทั้ง EXCHANGE_RATES และ CURRENCIES เพราะ currency display rate ต้องอัปเดตตาม
 * @returns UseMutationResult รับ ExchangeRateDto[]
 * @example
 * const bulk = useExchangeRateMutation();
 * bulk.mutate([{ currency_id: "USD", exchange_rate: 35.5 }]);
 */
export function useExchangeRateMutation() {
  return useApiMutation<ExchangeRateDto[]>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.EXCHANGE_RATES(buCode), data),
    invalidateKeys: [QUERY_KEYS.EXCHANGE_RATES, QUERY_KEYS.CURRENCIES],
    errorMessage: "Failed to update exchange rates",
  });
}

/**
 * Hook สำหรับแก้ไขอัตราแลกเปลี่ยนรายการเดียวตาม id (PATCH)
 * Invalidate ทั้ง EXCHANGE_RATES และ CURRENCIES
 * @returns UseMutationResult รับ { id, exchange_rate }
 * @example
 * const update = useExchangeRateUpdate();
 * update.mutate({ id: rate.id, exchange_rate: 36.0 });
 */
export function useExchangeRateUpdate() {
  return useApiMutation<{ id: string; doc_version?: number; exchange_rate: number }>({
    mutationFn: ({ id, ...data }, buCode) =>
      httpClient.patch(
        `${API_ENDPOINTS.EXCHANGE_RATES(buCode)}/${id}`,
        data,
      ),
    invalidateKeys: [QUERY_KEYS.EXCHANGE_RATES, QUERY_KEYS.CURRENCIES],
    errorMessage: "Failed to update exchange rate",
  });
}

/**
 * Hook สำหรับสร้างอัตราแลกเปลี่ยนใหม่ (wrap เป็น array แล้ว POST)
 * Invalidate ทั้ง EXCHANGE_RATES และ CURRENCIES
 * @returns UseMutationResult รับ ExchangeRateDto
 * @example
 * const create = useExchangeRateCreate();
 * create.mutate({ currency_id: "EUR", exchange_rate: 38.2 });
 */
export function useExchangeRateCreate() {
  return useApiMutation<ExchangeRateDto>({
    mutationFn: (data, buCode) =>
      httpClient.post(API_ENDPOINTS.EXCHANGE_RATES(buCode), [data]),
    invalidateKeys: [QUERY_KEYS.EXCHANGE_RATES, QUERY_KEYS.CURRENCIES],
    errorMessage: "Failed to create exchange rate",
  });
}

/**
 * Hook สำหรับลบอัตราแลกเปลี่ยนตาม id
 * Invalidate ทั้ง EXCHANGE_RATES และ CURRENCIES
 * @returns UseMutationResult รับ { id }
 * @example
 * const del = useExchangeRateDelete();
 * del.mutate({ id: rate.id });
 */
export function useExchangeRateDelete() {
  return useApiMutation<{ id: string }>({
    mutationFn: ({ id }, buCode) =>
      httpClient.delete(`${API_ENDPOINTS.EXCHANGE_RATES(buCode)}/${id}`),
    invalidateKeys: [QUERY_KEYS.EXCHANGE_RATES, QUERY_KEYS.CURRENCIES],
    errorMessage: "Failed to delete exchange rate",
  });
}

/**
 * Hook ดึงอัตราแลกเปลี่ยนจาก API ภายนอก เทียบกับสกุลเงินฐาน
 * ไม่ refetch เมื่อ focus window และ retry สูงสุด 3 ครั้งด้วย exponential backoff
 * ใช้ CACHE_NORMAL (staleTime 5 นาที)
 * @param baseCurrency - รหัสสกุลเงินฐาน เช่น "USD", "THB"
 * @returns UseQueryResult ของ Record<string, number> (เช่น { THB: 35.5, EUR: 0.92 })
 * @example
 * const { data: rates } = useExternalExchangeRates("USD");
 * const thbRate = rates?.THB;
 */
export function useExternalExchangeRates(baseCurrency: string) {
  return useQuery<Record<string, number>>({
    queryKey: ["exchangeRates", baseCurrency],
    queryFn: async () => {
      // TODO(phase-config): /api/exchange-rate was a Next route — move to backend or client-side fetch when the config module migrates
      const res = await fetch(
        `/api/exchange-rate?base=${encodeURIComponent(baseCurrency)}`,
      );
      if (!res.ok)
        throw new Error(`Failed to fetch exchange rates: ${res.status}`);
      // บน static hosting (S3/GCS) endpoint นี้ยังไม่มี — SPA fallback คืน index.html
      // ด้วย status 200 ทำให้ res.json() throw SyntaxError ที่สื่อความหมายไม่ได้
      // ตรวจ Content-Type ก่อน เพื่อ degrade gracefully จนกว่า backend จะมี endpoint
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json"))
        throw new Error("Exchange rate endpoint is not available");
      const data: ExternalRateResponse = await res.json();
      if (data.result !== "success")
        throw new Error("Exchange rate API returned an error");
      return data.conversion_rates;
    },
    enabled: !!baseCurrency,
    ...CACHE_NORMAL,
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });
}
