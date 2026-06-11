const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * จัดรูปแบบ ISO date string ตาม pattern ที่กำหนดจาก profile config
 *
 * รองรับ token:
 *  - วันที่: DD, D, MM, M, MMM, MMMM, YYYY, YY
 *  - เวลา: HH, hh, mm, ss, A, a
 * ใช้การ match token ที่ยาวที่สุดก่อนเพื่อป้องกัน partial replacement
 * คืน empty string หาก iso ไม่ใช่วันที่ที่ถูกต้อง
 *
 * @param iso - ISO date string ที่จะจัดรูปแบบ
 * @param dateFormat - pattern รูปแบบวันที่ เช่น "DD/MM/YYYY HH:mm"
 * @returns string ของวันที่ตามรูปแบบ หรือ empty string หาก parse ไม่ได้
 * @example
 * ```ts
 * formatDate("2026-04-09T09:30:00Z", "DD MMM YYYY"); // "09 Apr 2026"
 * formatDate("2026-04-09T09:30:00Z", "MM/DD/YYYY hh:mm A"); // "04/09/2026 09:30 AM"
 * ```
 */
export function formatDate(iso: string, dateFormat: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";

  const day = d.getDate();
  const month = d.getMonth(); // 0-indexed
  const year = d.getFullYear();
  const hours24 = d.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  const ampm = hours24 < 12 ? "AM" : "PM";

  const tokens: Record<string, string> = {
    YYYY: String(year),
    yyyy: String(year),
    YY: String(year).slice(-2),
    yy: String(year).slice(-2),
    MMMM: FULL_MONTHS[month],
    MMM: SHORT_MONTHS[month],
    MM: String(month + 1).padStart(2, "0"),
    DD: String(day).padStart(2, "0"),
    dd: String(day).padStart(2, "0"),
    D: String(day),
    M: String(month + 1),
    HH: String(hours24).padStart(2, "0"),
    hh: String(hours12).padStart(2, "0"),
    mm: String(minutes).padStart(2, "0"),
    ss: String(seconds).padStart(2, "0"),
    A: ampm,
    a: ampm.toLowerCase(),
  };

  // Match longest tokens first to avoid partial replacements
  const pattern = Object.keys(tokens)
    .sort((a, b) => b.length - a.length)
    .join("|");

  return dateFormat.replaceAll(
    new RegExp(pattern, "g"),
    (match) => tokens[match],
  );
}

/**
 * คำนวณจำนวนวันระหว่างสอง ISO date string
 *
 * คืน 0 หากค่าใดค่าหนึ่งเป็น empty string หรือ parse ไม่ได้
 * ปัดเศษเป็นจำนวนเต็มและไม่คืนค่าติดลบ
 *
 * @param a - ISO date string ของวันเริ่มต้น
 * @param b - ISO date string ของวันสิ้นสุด
 * @returns จำนวนวันระหว่างสองวัน (ค่าเป็นจำนวนเต็ม >= 0)
 * @example
 * ```ts
 * daysBetween("2026-04-01", "2026-04-10"); // 9
 * ```
 */
export function daysBetween(a: string, b: string): number {
  if (!a || !b) return 0;
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24)));
}

/**
 * แปลง ISO date string เป็นรูปแบบ YYYY-MM-DD สำหรับ HTML `<input type="date">`
 *
 * ตัดเฉพาะส่วนวันที่จาก ISO string คืน empty string หาก parse ไม่ได้
 *
 * @param iso - ISO date string ที่จะแปลง
 * @returns string รูปแบบ `YYYY-MM-DD` หรือ empty string หาก parse ไม่ได้
 * @example
 * ```ts
 * // ใช้ใน controlled date input
 * <input type="date" value={isoToDateInput(record.created_at)} />
 * ```
 */
export function isoToDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

/**
 * จัดรูปแบบวันที่เป็น "DD MMM YYYY" แบบ locale-aware (ตัว canonical สำหรับ short date)
 *
 * ใช้ `Intl.DateTimeFormat` แปลชื่อเดือนตาม locale (เช่น "Apr" → "เม.ย." เมื่อ
 * locale = "th") และบังคับ Gregorian calendar กันไม่ให้แปลงปีเป็นพุทธศักราช
 * รับได้ทั้ง string, Date และ null/undefined (คืน "" เมื่อ parse ไม่ได้)
 *
 * @param iso - ISO date string หรือ Date object
 * @param locale - locale code (เช่น "en", "th"); default "en"
 * @returns string รูปแบบสั้นตาม locale หรือ empty string หาก parse ไม่ได้
 * @example
 * ```ts
 * formatLocalizedDate("2026-04-09T09:30:00Z", "en"); // "09 Apr 2026"
 * formatLocalizedDate("2026-04-09T09:30:00Z", "th"); // "09 เม.ย. 2026"
 * ```
 */
export function formatLocalizedDate(
  iso: string | Date | null | undefined,
  locale = "en",
): string {
  if (!iso) return "";
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    calendar: "gregory",
  }).format(date);
}
