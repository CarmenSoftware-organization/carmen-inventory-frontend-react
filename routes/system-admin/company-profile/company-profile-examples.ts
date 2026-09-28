import { format } from "date-fns";

/**
 * ตัวอย่างผลลัพธ์ที่โชว์ข้างค่าตั้งในหน้า Company Profile — pattern ดิบอย่าง
 * `MM/dd/yyyy hh:mm a` อ่านยาก เห็นวันนี้ในรูปแบบนั้นเลยเข้าใจทันที
 *
 * ทุกตัวคืน `null` เมื่อค่าใช้ไม่ได้ (pattern/locale/timezone ผิด) — ตัวอย่างเป็นแค่
 * ของประกอบ ต้องไม่ทำหน้าพัง
 */

/** ตัวเลขตัวอย่าง — มีหลักพันและทศนิยมพอให้เห็นทั้งตัวคั่นและการปัด */
const SAMPLE_NUMBER = 12345.6789;

/** `now` ในรูปแบบ date-fns pattern ที่ให้มา เช่น `dd/MM/yyyy` → `28/09/2026` */
export function datePatternExample(pattern: string, now: Date): string | null {
  try {
    return format(now, pattern);
  } catch {
    return null;
  }
}

/** เวลาปัจจุบันใน timezone นั้น พร้อม offset เช่น `Asia/Bangkok` → `16:58 GMT+7` */
export function timezoneExample(timeZone: string, now: Date): string | null {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "shortOffset",
    }).format(now);
  } catch {
    return null;
  }
}

/** ตัวเลขตัวอย่างตาม locale และจำนวนทศนิยม เช่น (`th-TH`, 2) → `12,345.68` */
export function numberExample(
  locales: string | null | undefined,
  decimals: number,
): string | null {
  if (!locales) return null;
  try {
    return SAMPLE_NUMBER.toLocaleString(locales, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    return null;
  }
}
