import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { ExchangeRateItem } from "@/types/exchange-rate";

export function createExchangeRateSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    exchange_rate: z
      .number()
      .min(0, tv("minZero", { field: tf("exchangeRate") })),
  });
}

export type ExchangeRateFormValues = z.infer<
  ReturnType<typeof createExchangeRateSchema>
>;

export const EMPTY_FORM: ExchangeRateFormValues = {
  exchange_rate: 0,
};

export function getDefaultValues(
  item?: ExchangeRateItem,
): ExchangeRateFormValues {
  if (!item) return { ...EMPTY_FORM };
  return {
    exchange_rate: item.exchange_rate,
  };
}

export function createManualExchangeRateSchema(
  tv: TranslationFn,
  tf: TranslationFn,
) {
  return z.object({
    currency_id: z.string().min(1, tv("required", { field: tf("currency") })),
    at_date: z.string().min(1, tv("required", { field: tf("date") })),
    exchange_rate: z.coerce
      .number()
      .min(0, tv("minZero", { field: tf("exchangeRate") })),
  });
}

export type ManualExchangeRateFormValues = z.infer<
  ReturnType<typeof createManualExchangeRateSchema>
>;

export const EMPTY_MANUAL_FORM: ManualExchangeRateFormValues = {
  currency_id: "",
  at_date: new Date().toISOString(),
  exchange_rate: 0,
};
