/**
 * ตัดสินว่าราคาต่อหน่วยของรายการนี้ "แพงกว่าครั้งก่อนจนควรทัก" หรือยัง
 *
 * ระบบมีข้อมูลนี้อยู่แล้ว (`PRODUCT_LAST_RECEIVING_BY_UNIT`) แต่เดิมต้องเอาเมาส์ไปชี้
 * ทีละแถวถึงจะเห็น คนอนุมัติวันละหลายสิบใบ ใบละสิบแถว จึงไม่มีใครไปชี้จริง — ตัวนี้
 * ทำให้ระบบทักเองเมื่อส่วนต่างถึงเกณฑ์ แทนที่จะรอให้คนสงสัยก่อน
 */

/**
 * แพงกว่าครั้งก่อนกี่ % ถึงจะทัก
 *
 * 10% เป็นค่าตั้งต้นที่เลือกเอง ยังไม่ได้ยืนยันกับหน้างาน — ต่ำไปคนจะเห็นธงแดงทุกแถว
 * จนชินแล้วมองข้าม สูงไปก็ไม่จับอะไรเลย ปรับที่นี่ที่เดียว
 */
export const PRICE_ALERT_THRESHOLD_PCT = 10;

export interface PriceAlert {
  /** แพงกว่าครั้งก่อนกี่เปอร์เซ็นต์ (ปัดเป็นจำนวนเต็ม) */
  diffPct: number;
  /** ต้นทุนต่อหน่วยครั้งล่าสุดที่รับเข้า — เอาไว้โชว์ให้เทียบ */
  lastCost: number;
}

/**
 * @param price - ราคาต่อหน่วยในรายการตอนนี้
 * @param lastCost - ต้นทุนต่อหน่วยครั้งล่าสุดที่รับเข้า (`cost_per_unit`)
 * @param thresholdPct - เกณฑ์ทัก (default `PRICE_ALERT_THRESHOLD_PCT`)
 * @returns ข้อมูลสำหรับแสดงเตือน หรือ `null` เมื่อไม่ต้องทัก
 * @example
 * computePriceAlert(520, 440) // { diffPct: 18, lastCost: 440 }
 */
export function computePriceAlert(
  price: number | null | undefined,
  lastCost: number | null | undefined,
  thresholdPct: number = PRICE_ALERT_THRESHOLD_PCT,
): PriceAlert | null {
  const now = Number(price);
  const before = Number(lastCost);
  // ยังไม่เคยรับเข้า (ไม่มีของให้เทียบ) หรือราคายังไม่ได้กรอก = ไม่ใช่เรื่องผิดปกติ
  // เงียบไว้ ไม่ใช่ทักว่าน่าสงสัย
  if (!Number.isFinite(now) || !Number.isFinite(before)) return null;
  if (now <= 0 || before <= 0) return null;

  const diffPct = Math.round(((now - before) / before) * 100);
  if (diffPct < thresholdPct) return null;

  return { diffPct, lastCost: before };
}
