export interface ExchangeRateItem {
  id: string;
  currency_id: string;
  currency_code: string;
  exchange_rate: number;
  at_date: string;
  created_at: string;
  updated_at: string;
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
