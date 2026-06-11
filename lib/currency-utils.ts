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
export function formatCurrency(
  value: number,
  decimals: number = 2,
): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * จัดรูปแบบจำนวนเงินตามการตั้งค่า amountFormat ของ profile
 *
 * หากค่าน้อยกว่า 10 จะใช้ minimumIntegerDigits = 1 เพื่อไม่ให้แสดงเป็น "00.00"
 *
 * @param value - ค่าตัวเลขที่จะจัดรูปแบบ
 * @param amountFormat - การตั้งค่า locale และ minimumIntegerDigits จาก profile
 * @returns string ของจำนวนเงินที่จัดรูปแบบแล้ว
 * @example
 * ```ts
 * formatAmount(1234.5, { locales: "th-TH", minimumIntegerDigits: 3 }); // "1,234.50"
 * formatAmount(0); // "0.00" (ไม่เป็น "000.00")
 * ```
 */
export function formatAmount(
  value: number,
  amountFormat?: { locales: string; minimumIntegerDigits: number } | null,
): string {
  if (amountFormat) {
    // Use minimumIntegerDigits: 1 when value < 10 to avoid "00.00" for zero
    const minIntDigits = Math.abs(value) < 10 ? 1 : amountFormat.minimumIntegerDigits;
    return value.toLocaleString(amountFormat.locales, {
      minimumIntegerDigits: minIntDigits,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return formatCurrency(value);
}

/** จำนวนทศนิยมมาตรฐานสำหรับ exchange rate ทั้งระบบ */
export const EXCHANGE_RATE_DECIMALS = 5;

/**
 * จัดรูปแบบอัตราแลกเปลี่ยนเป็นจำนวนทศนิยม 5 ตำแหน่งพร้อม currency code ต่อท้าย
 *
 * ค่า rate ที่ส่งเข้ามาต้องเป็น "X default per 1 currency" ที่เก็บใน DB อยู่แล้ว
 * ไม่ต้อง invert ใดๆ ภายในฟังก์ชัน
 *
 * @param rate - อัตราแลกเปลี่ยน (default per 1 currency)
 * @param currencyCode - รหัสสกุลเงิน default ที่จะต่อท้าย
 * @returns string ที่จัดรูปแบบแล้ว หรือ "-" หากไม่มี rate
 * @example
 * ```ts
 * formatExchangeRate(35.71428, "THB"); // "35.71428 THB"
 * formatExchangeRate(null); // "-"
 * ```
 */
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
