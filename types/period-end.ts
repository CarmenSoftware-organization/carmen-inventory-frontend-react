import type { AuditInfo } from "@/types/workflows";
import type {
  PhysicalCountLocation,
  PhysicalCountPeriodStatus,
} from "@/types/physical-count";

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

export type PeriodEndStatus = "open" | "closed" | "locked";

export type ReviewTransactionKey = "pr" | "po" | "grn" | "cn" | "sr" | "si" | "so";

/** ประเภทเอกสารที่ต้องเคลียร์ก่อนเปิดรอบตรวจนับ — PR/PO ไม่อยู่ในนี้เพราะไม่แตะ ledger */
export type StartCountingBlockerKey = "grn" | "stock_in" | "stock_out" | "sr";

/** รายการเอกสารค้างที่ backend ส่งมากับ 422 เพื่อให้ UI ลิสต์ให้ user ไปจัดการต่อได้ */
export interface StartCountingBlockers {
  counts: Record<StartCountingBlockerKey, number>;
  total: number;
  documents: Record<StartCountingBlockerKey, ReviewDocument[]>;
}

/** ผลลัพธ์ของการเปิดรอบตรวจนับ — `already_counting` = เปิดอยู่แล้ว (กดซ้ำได้ ไม่ error) */
export interface StartCountingResult {
  period: PeriodEnd;
  physical_count_period: { id: string; status: PhysicalCountPeriodStatus };
  created: boolean;
  already_counting: boolean;
}

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
  /** รอบตรวจนับของงวดนี้ — null เมื่อยังไม่เคยเปิด */
  physical_count_period: {
    id: string;
    status: PhysicalCountPeriodStatus;
  } | null;
  can_start_counting: boolean;
  start_blocking: {
    counts: Record<StartCountingBlockerKey, number>;
    total: number;
  };
  /**
   * มาจาก backend ไม่ใช่คำนวณเองที่ฝั่ง UI
   *
   * เดิมหน้า review คิดเองจาก `is_complete` ของทุกโมดูล ซึ่ง backend คืน false เมื่อโมดูลนั้น
   * ไม่มีเอกสารเลย (`count > 0 && ...`) งวดที่ไม่มีใบลดหนี้จึงปิดไม่ได้ตลอดกาล
   */
  can_close: boolean;
  close_blocking: {
    sr: number;
    grn: number;
    cn: number;
    stock_in: number;
    stock_out: number;
    physical_count: number;
  };
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
