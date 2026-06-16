export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  description: string;
  decimal_places: number;
  is_active: boolean;
  doc_version: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCurrencyDto {
  code: string;
  name: string;
  symbol: string;
  exchange_rate: number;
  description: string;
  decimal_places: number;
  is_active: boolean;
  // optimistic-concurrency token round-tripped on PATCH (omitting it → 400)
  doc_version?: number;
}
