import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import type { ExchangeRateItem } from "@/types/exchange-rate";

/**
 * สร้าง Zod schema สำหรับฟอร์มแก้ไข Exchange Rate พร้อมข้อความแปลจาก i18n
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Exchange Rate
 * @example
 * // route: /config/exchange-rate (edit dialog)
 * const schema = createExchangeRateSchema(tv, tfl);
 */
export function createExchangeRateSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    exchange_rate: z.number().min(0, tv("minZero", { field: tf("exchangeRate") })),
  });
}

export type ExchangeRateFormValues = z.infer<ReturnType<typeof createExchangeRateSchema>>;

export const EMPTY_FORM: ExchangeRateFormValues = {
  exchange_rate: 0,
};

/**
 * คืนค่าเริ่มต้นของฟอร์ม Exchange Rate จากรายการที่มี หรือค่าว่างหากไม่มี
 * @param item - ข้อมูล Exchange Rate ที่ต้องการนำมาเป็นค่าเริ่มต้น (optional)
 * @returns ค่าเริ่มต้นของฟอร์ม
 * @example
 * // route: /config/exchange-rate (dialog)
 * const defaults = getDefaultValues(item);
 */
export function getDefaultValues(item?: ExchangeRateItem): ExchangeRateFormValues {
  if (!item) return { ...EMPTY_FORM };
  return {
    exchange_rate: item.exchange_rate,
  };
}

/**
 * สร้าง Zod schema สำหรับฟอร์มเพิ่ม Exchange Rate แบบ manual
 * @param tv - ฟังก์ชันแปลข้อความ validation
 * @param tf - ฟังก์ชันแปลชื่อ field
 * @returns Zod schema สำหรับตรวจสอบฟอร์ม Manual Exchange Rate
 * @example
 * // route: /config/exchange-rate (manual create dialog)
 * const schema = createManualExchangeRateSchema(tv, tfl);
 */
export function createManualExchangeRateSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    currency_id: z.string().min(1, tv("required", { field: tf("currency") })),
    at_date: z.string().min(1, tv("required", { field: tf("date") })),
    exchange_rate: z.coerce.number().min(0, tv("minZero", { field: tf("exchangeRate") })),
  });
}

export type ManualExchangeRateFormValues = z.infer<ReturnType<typeof createManualExchangeRateSchema>>;

export const EMPTY_MANUAL_FORM: ManualExchangeRateFormValues = {
  currency_id: "",
  at_date: new Date().toISOString(),
  exchange_rate: 0,
};
