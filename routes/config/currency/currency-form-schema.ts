import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { Currency } from "@/types/currency";

export function createCurrencySchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    code: z.string().min(1, tv("required", { field: tf("code") })),
    name: z.string().min(1, tv("required", { field: tf("name") })),
    symbol: z
      .string()
      .min(1, tv("required", { field: tf("symbol") }))
      .max(5, tv("symbolMaxLength", { max: 5 })),
    exchange_rate: z
      .number()
      .positive(tv("positive", { field: tf("exchangeRate") })),
    description: z.string(),
    decimal_places: z.coerce.number().int().min(0).max(8),
    is_active: z.boolean(),
  });
}

export type CurrencyFormValues = z.infer<
  ReturnType<typeof createCurrencySchema>
>;

export const EMPTY_FORM: CurrencyFormValues = {
  code: "",
  name: "",
  symbol: "",
  // ไม่มีค่าเริ่มต้นที่ "ถูก" ได้ — อัตราแลกเปลี่ยนต้องมาจากคนกรอกหรือจากแหล่งอัตราจริง
  // 0 ตกด่าน .positive() ของ schema ผู้ใช้จึงถูกบังคับให้กรอกก่อน save (เท่ากับ
  // exchange-rate-form-schema ที่ใช้ 0 เหมือนกัน)
  exchange_rate: 0,
  description: "",
  decimal_places: 2,
  is_active: true,
};

export function getDefaultValues(currency?: Currency): CurrencyFormValues {
  if (!currency) return { ...EMPTY_FORM };
  return {
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    exchange_rate: currency.exchange_rate,
    description: currency.description,
    decimal_places: currency.decimal_places,
    is_active: currency.is_active,
  };
}
