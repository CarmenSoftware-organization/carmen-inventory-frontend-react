/**
 * ปัดเศษตัวเลขให้เหลือทศนิยม 2 ตำแหน่ง แบบปลอดภัยจาก floating point errors
 *
 * ใช้ trick ของ exponential notation (e2 / e-2) เพื่อหลีกเลี่ยงปัญหา
 * ของ Math.round(n * 100) / 100 ที่อาจคลาดเคลื่อนในบางค่า
 *
 * @param n - ตัวเลขที่ต้องการปัดเศษ
 * @returns ตัวเลขที่ปัดเศษแล้วเหลือ 2 ตำแหน่ง
 * @example
 * ```ts
 * round2(1.005); // 1.01 (แก้ปัญหา floating point)
 * round2(12.3456); // 12.35
 * ```
 */
export const round2 = (n: number): number =>
  Number(Math.round(Number.parseFloat(n + "e2")) + "e-2");

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงินด้วย locale เริ่มต้น
 *
 * ใช้ `toLocaleString` กำหนดจำนวนทศนิยมทั้งขั้นต่ำและสูงสุดให้เท่ากัน
 * เพื่อให้ได้รูปแบบที่คงที่ (fixed decimals)
 *
 * @param value - ค่าตัวเลขที่จะจัดรูปแบบ
 * @param decimals - จำนวนทศนิยม (ค่าเริ่มต้น 2)
 * @returns string ของตัวเลขที่จัดรูปแบบแล้ว
 * @example
 * ```ts
 * formatCurrency(1234.5); // "1,234.50"
 * formatCurrency(1234.5678, 4); // "1,234.5678"
 * ```
 */
export function formatCurrency(value: number, decimals: number = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * จัดรูปแบบจำนวนเงินตาม locale ที่ BU ตั้งไว้ — คั่นหลักพัน ทศนิยม 2 ตำแหน่ง
 *
 * **ไม่ผูกกับ `amount_format.minimumIntegerDigits`** ถึงจะมีอยู่ในคอนฟิก เพราะนั่น
 * คือ "จำนวนหลักหน้าจุด" ขั้นต่ำของ Intl ซึ่งเติมศูนย์นำหน้าให้ — BU ที่ตั้งไว้ 4
 * ทำให้ 211.56 แสดงเป็น "0,211.56" ไม่มีใครเขียนจำนวนเงินแบบนั้น โค้ดเดิมรู้ปัญหา
 * แล้วแต่แก้เฉพาะค่าที่น้อยกว่า 10 (กัน "00.00") ค่าที่มากกว่านั้นยังโดนเติมอยู่
 *
 * กับดักตัวเดียวกับที่ฝั่ง "จำนวน" เคยเจอแล้วตัดขาดไปก่อนแล้ว — ดู
 * `components/ui/input/qty-decimals.ts`
 *
 * @param value - ค่าตัวเลขที่จะจัดรูปแบบ
 * @param amountFormat - การตั้งค่า locale จาก profile (อ่านเฉพาะ `locales`)
 * @returns string ของจำนวนเงินที่จัดรูปแบบแล้ว
 * @example
 * ```ts
 * formatAmount(211.56, { locales: "th-TH", minimumIntegerDigits: 4 }); // "211.56"
 * formatAmount(1234.5, { locales: "th-TH", minimumIntegerDigits: 3 }); // "1,234.50"
 * ```
 */
export function formatAmount(
  value: number,
  amountFormat?: { locales: string; minimumIntegerDigits?: number } | null,
): string {
  if (amountFormat) {
    return value.toLocaleString(amountFormat.locales, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return formatCurrency(value);
}

/** จำนวนทศนิยมมาตรฐานสำหรับ exchange rate ทั้งระบบ */
export const EXCHANGE_RATE_DECIMALS = 5;

export function formatExchangeRate(
  rate: number | null | undefined,
  currencyCode?: string | null,
): string {
  if (!rate) return "-";

  const formatted = rate.toLocaleString(undefined, {
    minimumFractionDigits: EXCHANGE_RATE_DECIMALS,
    maximumFractionDigits: EXCHANGE_RATE_DECIMALS,
  });

  return currencyCode ? `${formatted} ${currencyCode}` : formatted;
}
