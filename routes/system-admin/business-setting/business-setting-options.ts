/**
 * ตัวเลือกมาตรฐาน (global) สำหรับ dropdown ในหน้า Business Setting
 *
 * รายการ date/time pattern และ locale เป็นชุด global ที่ใช้บ่อย ส่วน timezone
 * ดึงจาก `Intl.supportedValuesOf("timeZone")` (รายการ IANA มาตรฐานของ runtime)
 * — `SelectField` จะ merge ค่าปัจจุบันเข้าไปเองถ้า backend คืนค่านอกรายการ
 */

/** IANA timezones ทั้งหมดที่ runtime รองรับ (fallback ชุดสั้นถ้าเรียกไม่ได้) */
export const TIMEZONES: readonly string[] = (() => {
  try {
    const fn = (
      Intl as unknown as { supportedValuesOf?: (k: string) => string[] }
    ).supportedValuesOf;
    const list = fn?.("timeZone");
    if (list && list.length) return list;
  } catch {
    // ignore — ใช้ fallback
  }
  return ["UTC", "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "Europe/London"];
})();

export const DATE_FORMATS: readonly string[] = [
  "yyyy-MM-dd",
  "dd/MM/yyyy",
  "MM/dd/yyyy",
  "dd-MM-yyyy",
  "dd.MM.yyyy",
  "yyyy/MM/dd",
  "d MMM yyyy",
  "MMM d, yyyy",
];

export const DATE_TIME_FORMATS: readonly string[] = [
  "yyyy-MM-dd HH:mm:ss",
  "yyyy-MM-dd HH:mm",
  "dd/MM/yyyy HH:mm:ss",
  "dd/MM/yyyy HH:mm",
  "MM/dd/yyyy hh:mm a",
  "MM/dd/yyyy hh:mm:ss a",
];

export const TIME_FORMATS: readonly string[] = [
  "HH:mm:ss",
  "HH:mm",
  "hh:mm:ss a",
  "hh:mm a",
];

export const SHORT_TIME_FORMATS: readonly string[] = ["HH:mm", "hh:mm a"];

export const LONG_TIME_FORMATS: readonly string[] = ["HH:mm:ss", "hh:mm:ss a"];

/** locale codes (BCP-47) ที่ใช้บ่อย สำหรับ number format */
export const LOCALES: readonly string[] = [
  "en-US",
  "en-GB",
  "th-TH",
  "ja-JP",
  "zh-CN",
  "zh-TW",
  "ko-KR",
  "de-DE",
  "fr-FR",
  "es-ES",
  "it-IT",
  "pt-BR",
  "ru-RU",
  "id-ID",
  "vi-VN",
  "ms-MY",
];
