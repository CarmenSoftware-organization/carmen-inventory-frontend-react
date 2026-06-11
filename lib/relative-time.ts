const DIVISIONS: { amount: number; unit: Intl.RelativeTimeFormatUnit }[] = [
  { amount: 60, unit: "second" },
  { amount: 60, unit: "minute" },
  { amount: 24, unit: "hour" },
  { amount: 7, unit: "day" },
  { amount: 4.34524, unit: "week" },
  { amount: 12, unit: "month" },
  { amount: Number.POSITIVE_INFINITY, unit: "year" },
];

/**
 * แปลง ISO date string เป็นข้อความเวลาแบบสัมพัทธ์ (เช่น "2 hours ago", "3 วันที่แล้ว")
 * ใช้ Intl.RelativeTimeFormat ของ browser ตาม locale
 * @param iso - ISO date string หรือ Date object
 * @param locale - locale code เช่น "en", "th"
 * @returns ข้อความเวลาแบบสัมพัทธ์ หรือ empty string ถ้า input ไม่ถูกต้อง
 * @example
 * formatRelativeTime("2026-04-20T04:33:35.777Z", "th") // "15 วันที่แล้ว"
 */
export function formatRelativeTime(
  iso: string | Date | null | undefined,
  locale = "en",
): string {
  if (!iso) return "";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  let duration = (date.getTime() - Date.now()) / 1000;

  for (const division of DIVISIONS) {
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.unit);
    }
    duration /= division.amount;
  }
  return "";
}
