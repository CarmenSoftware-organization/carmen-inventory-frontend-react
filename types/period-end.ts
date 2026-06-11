import type { AuditInfo } from "@/types/workflows";
import type { PhysicalCountLocation } from "@/types/physical-count";

export interface PeriodEnd {
  id: string;
  period: string;
  fiscal_year: number;
  fiscal_month: number;
  start_at: string;
  end_at: string;
  status: PeriodEndStatus;
  note: string | null;
  info: Record<string, unknown>;
  dimension: unknown[];
  audit: AuditInfo;
}

export type PeriodEndStatus = "open" | "closed";

export type ReviewTransactionKey = "pr" | "po" | "grn" | "cn" | "sr";

export interface ReviewDocument {
  id: string;
  no: string;
  status: string;
  date: string;
}

export interface ReviewTransactionStat {
  count: number;
  complete_count: number;
  incomplete_count: number;
  is_complete: boolean;
  documents: ReviewDocument[];
}

/**
 * API ส่ง physical_count เป็น flat structure เหมือนกับ PhysicalCountLocation
 * ของโมดูล PC — reuse type เพื่อความ consistent (id, code, name,
 * location_type, physical_count_status, ฯลฯ)
 */
export type ReviewPhysicalCountItem = PhysicalCountLocation;

export interface PeriodEndReview {
  id: string;
  start_date: string;
  end_date: string;
  status: PeriodEndStatus;
  details: {
    transaction: Record<ReviewTransactionKey, ReviewTransactionStat>;
    physical_count: ReviewPhysicalCountItem[];
  };
}

export enum StatusEop {
  IN_PROGRESS = "in_progress",
  NOT_CREATED = "not_created",
  COUNTED = "counted",
}

