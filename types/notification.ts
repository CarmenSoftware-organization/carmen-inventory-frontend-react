import type { PaginatedResponse } from "@/types/params";

export type NotificationDocType =
  | "system"
  | "business_unit"
  | "purchase_request"
  | "purchase_order"
  | "store_requisition"
  | "good_received_note"
  | "credit_note";

type NotificationEvent = "info" | "workflow" | "comment";

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
  id?: string | null;
  pr_id?: string;
  po_id?: string;
  sr_id?: string;
  grn_id?: string;
  cn_id?: string;
  action?: string;
  current_stage?: string;
  is_fully_approved?: boolean;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  source?: NotificationSource;
  doc_type?: NotificationDocType | null;
  event?: NotificationEvent | null;
  title?: string | null;
  message?: string | null;
  metadata?: NotificationMetadata | null;
  is_read?: boolean;
  pushed_at?: string | null;
  scheduled_at?: string | null;
  created_at?: string | null;
  from_user_id?: string | null;
  to_user_id?: string | null;
}

/**
 * ค่าสรุปยังไม่ได้อ่าน/อ่านแล้วทั้งชุดผลลัพธ์ — backend สร้างใน try/catch จึงเป็น
 * optional บนสาย **การไม่มีแปลว่า "สร้างค่าสรุปไม่ได้" ไม่ใช่ศูนย์**
 */
interface NotificationSummary {
  unread: number;
  read: number;
}

export interface NotificationListResponse extends PaginatedResponse<Notification> {
  summary?: NotificationSummary;
}
