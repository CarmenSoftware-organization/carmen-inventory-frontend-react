import { useProfile } from "@/hooks/use-profile";

/**
 * Hook อ่านค่าการตั้งค่าท้องถิ่น (รูปแบบวันที่ สกุลเงิน ทศนิยม) จากโปรไฟล์ผู้ใช้
 *
 * เป็น shortcut ที่ดึงเฉพาะ 3 ฟิลด์ของ locale ออกมาจาก `useProfile()`
 * ใช้สำหรับ format ตัวเลข/วันที่/เงิน ในการแสดงผลโดยไม่ต้อง destructure profile เต็ม
 *
 * @returns object ของ dateFormat, defaultCurrencyCode และ defaultCurrencyDecimalPlaces
 * @example
 * ```ts
 * const { dateFormat, defaultCurrencyCode } = useLocale();
 * const display = format(date, dateFormat);
 * ```
 */
export function useLocale() {
  const { dateFormat, defaultCurrencyCode, defaultCurrencyDecimalPlaces } =
    useProfile();
  return { dateFormat, defaultCurrencyCode, defaultCurrencyDecimalPlaces };
}
