import type { Audit } from "./audit";
import type { EntityRef } from "./entity-ref";

// ยืนยันจาก live: list (`/exchange-rates`) และ detail (`/exchange-rates/{id}`)
// ส่ง currency เป็น object เหมือนกันทุกแถว — ไม่มีคู่ flat currency_id/currency_code
// หลงเหลืออีก ประกาศ type เดียวใช้ร่วมกันได้
export interface ExchangeRateItem {
  id: string;
  doc_version: number;
  currency: EntityRef | null;
  exchange_rate: number;
  at_date: string;
  // flat fields ยังใช้อยู่ใน exchange-rate-dialog (อ่าน updated_at); list endpoint
  // จะไม่ส่งมา (serializer omit) แต่ enrich เป็น audit object แทน
  audit?: Audit;
}

export interface ExchangeRateDto {
  currency_id: string;
  at_date: string;
  exchange_rate: number;
}

export interface CurrencyWithDiff {
  id: string;
  code: string;
  oldRate: number;
  newRate: number;
  diff: number;
  diffPercent: number;
}
