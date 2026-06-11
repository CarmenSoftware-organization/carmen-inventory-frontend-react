import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { Currency } from "@/types/currency";

/**
 * สร้าง Zod schema สำหรับฟอร์ม Currency พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Currency
 * @example
 * // route: /config/currency (dialog)
 * const schema = createCurrencySchema(tv, tfl);
 */
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
  exchange_rate: 0.01,
  description: "",
  decimal_places: 2,
  is_active: true,
};

/**
 * คืนค่าเริ่มต้นของฟอร์ม Currency จาก entity ที่มี หรือค่าว่างหากไม่มี
 * @param currency - ข้อมูล Currency ที่ต้องการนำมาเป็นค่าเริ่มต้น (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม
 * @example
 * // route: /config/currency (dialog)
 * const defaults = getDefaultValues(currency);
 */
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
