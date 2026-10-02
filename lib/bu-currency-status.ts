export type BuCurrencyStatus = "ok" | "missing" | "invalid" | "unknown";

/**
 * รับแค่สองฟิลด์ที่ต้องใช้ และประกาศเป็น optional เอง (ไม่ผูกกับ `BusinessUnitConfig`)
 * เพราะ type ใน `types/profile.ts` บอกว่า `default_currency` มีเสมอ ซึ่งไม่จริง — ดูเคส
 * `unknown` ด้านล่าง
 */
interface CurrencyConfigInput {
  readonly default_currency_id?: string | null;
  readonly default_currency?: unknown;
}

/**
 * สถานะ default currency ของ BU จาก profile ล้วน ๆ (ไม่ยิง API เพิ่ม)
 *
 * backend (`auth.service.ts` ของ micro-business) หา `tb_currency` ด้วย id ใน tenant DB:
 * - ไม่ได้ตั้ง id → `missing`
 * - ตั้ง id แต่หาไม่เจอ → `findFirst` คืน `null` → `invalid`
 * - resolve tenant DB ไม่ได้ → ตัวแปรค้างเป็น `undefined` แล้วคีย์หายจาก JSON → `unknown`
 *   **ไม่เตือน** — ไม่รู้ว่า currency ถูกหรือผิด การขึ้นแถบตอนนั้นคือการหลอกผู้ใช้
 *   (เหตุผลเดียวกับเคส `"unresolved"` ใน `LicenseExpiredBanner`)
 *
 * currency ที่ถูก soft-delete หรือ inactive ยังได้ `ok` — backend ไม่กรองสองอย่างนี้
 * จึงแยกไม่ออกจาก profile (ตัดสินใจแล้วว่าไม่ครอบเคสนี้)
 */
export function resolveBuCurrencyStatus(
  config: CurrencyConfigInput | null | undefined,
): BuCurrencyStatus {
  if (!config) return "unknown";
  if (!config.default_currency_id) return "missing";
  if (config.default_currency === null) return "invalid";
  if (config.default_currency === undefined) return "unknown";
  return "ok";
}
