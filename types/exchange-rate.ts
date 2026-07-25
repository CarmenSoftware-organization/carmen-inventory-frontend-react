import type { Audit } from "./audit";

export interface ExchangeRateItem {
  id: string;
  doc_version: number;
  currency_id: string;
  currency_code: string;
  exchange_rate: number;
  at_date: string;
  // flat fields ยังใช้อยู่ใน exchange-rate-dialog (อ่าน updated_at); list endpoint
  // จะไม่ส่งมา (serializer omit) แต่ enrich เป็น audit object แทน
  created_at: string;
  updated_at: string;
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
