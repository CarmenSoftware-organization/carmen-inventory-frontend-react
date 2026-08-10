import type { PaginatedResponse } from "@/types/params";

/**
 * @deprecated ถูกแทนที่ด้วย NotificationDocType และ NotificationEvent
 * สำหรับการอ่านข้อมูลเก่า — จะถูกลบใน Task 6
 */
export type NotificationCategory =
  | "system-to-user"
  | "bu-to-user"
  | "user-to-user";

/**
 * @deprecated ถูกแทนที่ด้วย NotificationDocType
 * สำหรับการอ่านข้อมูลเก่า — จะถูกลบใน Task 6
 */
export type NotificationEntityType = "PR" | "PO" | "SR";

/**
 * ชนิดเอกสารที่การแจ้งเตือนอ้างถึง — ตรงกับ `enum_notification_doc_type` ฝั่ง platform schema
 * (`system`/`business_unit` คือประกาศ ไม่ผูกกับเอกสารใด)
 */
export type NotificationDocType =
  | "system"
  | "business_unit"
  | "purchase_request"
  | "purchase_order"
  | "store_requisition"
  | "good_received_note"
  | "credit_note";

/** เหตุการณ์ที่ทำให้เกิดการแจ้งเตือน — ตรงกับ `enum_notification_event` */
export type NotificationEvent = "info" | "workflow" | "comment";

/**
 * แหล่งของแถว — `personal` = `tb_notification`, `broadcast` = `tb_broadcast_notification`
 * ต้องส่งกลับไปใน body ของ mark-read เพื่อให้ backend เขียนลงตารางที่ถูก
 */
export type NotificationSource = "personal" | "broadcast";

/**
 * Metadata ที่ backend แนบมา — write path ใหม่เขียน id เอกสารไว้ที่ `id` เสมอ
 * ส่วนคีย์รายเอกสารเป็นของแถวก่อน redesign ที่ยังค้างอยู่ในฐาน ไม่มีการผลิตใหม่
 */
export interface NotificationMetadata {
  /** id เอกสาร (จาก `doc_id` ของ envelope) — คีย์หลักที่ใช้สร้าง deep-link */
  id?: string | null;
  /** @deprecated คีย์เก่าก่อน redesign — อ่านเป็น fallback ของแถวประวัติเท่านั้น */
  pr_id?: string;
  /** @deprecated ดู `pr_id` */
  po_id?: string;
  /** @deprecated ดู `pr_id` */
  sr_id?: string;
  /** @deprecated ดู `pr_id` */
  grn_id?: string;
  /** @deprecated ดู `pr_id` */
  cn_id?: string;
  action?: string;
  current_stage?: string;
  is_fully_approved?: boolean;
  [key: string]: unknown;
}

/** แถวการแจ้งเตือนหนึ่งใบตามที่ gateway ส่งมา (รวมทั้งแถวส่วนตัวและแถวประกาศ) */
export interface Notification {
  id: string;
  /** `personal` (ส่งตรง to_user_id) หรือ `broadcast` (system-wide) */
  source?: NotificationSource;
  /** Document type ใหม่ — แทนที่ type */
  doc_type?: NotificationDocType | null;
  /** Event type ใหม่ — แทนที่ type */
  event?: NotificationEvent | null;
  /** Title ของการแจ้งเตือน */
  title?: string | null;
  /** Message/body ของการแจ้งเตือน */
  message?: string | null;
  /** Entity reference + action */
  metadata?: NotificationMetadata | null;
  /** อ่านแล้วหรือยัง */
  is_read?: boolean;
  /** เวลาที่ถูก emit ขึ้น WS — null = ยังไม่เคย emit (เช่นยังตั้งเวลาอยู่) */
  pushed_at?: string | null;
  /** Scheduled time (ถ้ากำหนดเวลา) */
  scheduled_at?: string | null;
  /**
   * nullable บนสายจริง แต่คงเป็น required ไว้ก่อนเพื่อให้ tree คอมไพล์ผ่าน —
   * ผู้ใช้ค่ายังเรียก `new Date(created_at)` ตรง ๆ อยู่ Task 2 กัน null ที่จุดแสดงผล
   * แล้วจะเปลี่ยนฟิลด์นี้เป็น `created_at?: string | null` ตามสัญญาจริง
   */
  created_at: string;
  /** User ที่ส่งมา */
  from_user_id?: string | null;
  /** User ที่รับ */
  to_user_id?: string | null;

  /** @deprecated ถูกแทนที่ด้วย `doc_type` + `event` — คอลัมน์ถูก DROP ไปแล้ว ลบใน Task 6 */
  type: string;
  /** @deprecated ถูกแทนที่ด้วย `source` — คอลัมน์ถูก DROP ไปแล้ว ลบใน Task 6 */
  category?: string;
  /** @deprecated คอลัมน์ถูก DROP ไปแล้ว ลบใน Task 6 */
  is_sent?: boolean;
  /** @deprecated backend ไม่เคยส่งฟิลด์นี้มา ลบใน Task 6 */
  link?: string;
}

/**
 * ค่าสรุปยังไม่ได้อ่าน/อ่านแล้วทั้งชุดผลลัพธ์ — backend สร้างใน try/catch จึงเป็น
 * optional บนสาย **การไม่มีแปลว่า "สร้างค่าสรุปไม่ได้" ไม่ใช่ศูนย์**
 */
export interface NotificationSummary {
  unread: number;
  read: number;
}

/** ซองของ `GET /api/notifications` และ `GET /api/notifications/unread` */
export interface NotificationListResponse
  extends PaginatedResponse<Notification> {
  summary?: NotificationSummary;
}
