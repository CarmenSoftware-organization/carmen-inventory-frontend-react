export const TIMEZONES: readonly string[] = [
  // ── Southeast Asia (ก่อน) ──
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Kuala_Lumpur",
  "Asia/Jakarta",
  "Asia/Ho_Chi_Minh",
  "Asia/Manila",
  "Asia/Yangon",
  "Asia/Phnom_Penh",
  "Asia/Vientiane",
  "Asia/Brunei",
  "Asia/Dili",
];

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
export const LOCALES: readonly string[] = ["en-US", "th-TH", "ja-JP"];
