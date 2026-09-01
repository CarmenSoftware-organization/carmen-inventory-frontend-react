export type JournalVoucherStatus =
  | "draft"
  | "submitted"
  | "posting"
  | "scheduled"
  | "posted"
  | "post_failed"
  | "voided"
  | "reversal_scheduled"
  | "reversed";

export interface JournalVoucherLineInput {
  account_id: string;
  department_id: string | null;
  comment: string | null;
  currency_id: string;
  exchange_rate: string;
  rate_date: string | null;
  rate_type: string | null;
  rate_source: string | null;
  debit: string;
  credit: string;
  dimension: unknown[];
}

export interface JournalVoucherInput {
  journal_type: string;
  prefix: string;
  journal_date: string;
  description: string;
  note: string | null;
  functional_currency_id: string;
  source_type: string | null;
  source_id: string | null;
  source_no: string | null;
  schedule_post: boolean;
  scheduled_post_at: string | null;
  auto_reverse: boolean;
  reverse_date: string | null;
  lines: JournalVoucherLineInput[];
}

export interface JournalVoucherLine extends JournalVoucherLineInput {
  id: string;
  sequence_no: number;
  account_code: string | null;
  account_name: string | null;
  department_code: string | null;
  department_name: string | null;
  currency_code: string | null;
  base_debit: string;
  base_credit: string;
}

export interface JournalVoucher extends JournalVoucherInput {
  id: string;
  doc_version: number;
  display_no: string;
  jv_no: string | null;
  draft_reference: string;
  jv_status: JournalVoucherStatus;
  jv_date: string;
  jv_type: string;
  base_currency_id: string;
  total_debit: string;
  total_credit: string;
  workflow_enabled_snapshot: boolean;
  lines: JournalVoucherLine[];
}

export interface JournalVoucherAction {
  doc_version: number;
  idempotency_key?: string;
  reason?: string;
  destination_stage?: string;
  scheduled_post_at?: string;
  reverse_date?: string;
}
