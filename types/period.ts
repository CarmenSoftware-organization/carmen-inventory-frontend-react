export type PeriodStatus = "open" | "closed" | "locked";

export interface Period {
  id: string;
  doc_version?: number;
  period: string;
  fiscal_year: number;
  fiscal_month: number;
  start_at: string;
  end_at: string;
  status: PeriodStatus;
  created_at: string;
  updated_at: string;
}

export interface CreatePeriodDto {
  doc_version?: number;
  fiscal_year: number;
  fiscal_month: number;
  start_at: string;
  end_at: string;
  status: PeriodStatus;
}

export interface GenerateNextPeriodDto {
  count: number;
  start_day: number;
}
