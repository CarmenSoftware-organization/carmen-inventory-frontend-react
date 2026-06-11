export type NotificationCategory =
  | "system-to-user"
  | "bu-to-user"
  | "user-to-user";

/**
 * Entity kind ที่ notification อ้างถึง — ใช้ map เป็น detail route
 * (`PR` → purchase request, `PO` → purchase order, `SR` → store requisition)
 */
export type NotificationEntityType = "PR" | "PO" | "SR";

export type NotificationSource = "personal" | "broadcast";

/**
 * Metadata ที่ backend แนบมากับ notification — `id` คือ entity id (เช่น
 * purchase_request.id) ที่ใช้คู่กับ `type` ระดับบนสร้าง deep-link
 */
export interface NotificationMetadata {
  /** Generic entity id (legacy / fallback) */
  id?: string;
  /** Entity-specific ids — backend ใส่ key ตาม entity type (PO → po_id, PR → pr_id, SR → sr_id) */
  po_id?: string;
  pr_id?: string;
  sr_id?: string;
  cn_id?: string;
  grn_id?: string;
  no?: string;
  po_no?: string;
  pr_no?: string;
  sr_no?: string;
  cn_no?: string;
  grn_no?: string;
  type?: string;
  action?: string;
  channel?: string;
  slot?: string;
  current_stage?: string;
  is_fully_approved?: boolean;
  notification_template_id?: string;
  vendor_id?: string;
  vendor_name?: string;
}

export interface Notification {
  id: string;
  /** `personal` (ส่งตรง to_user_id) หรือ `broadcast` (system-wide) */
  source?: NotificationSource;
  title: string;
  message: string;
  /** Entity type (`PR/PO/SR`) สำหรับ deep-link หรือ string อื่น (free-form notification) */
  type: NotificationEntityType | string;
  /** category จาก list endpoint — ใช้ route การ mark-read ไปตารางที่ถูก (broadcast/personal) */
  category?: NotificationCategory;
  /** entity reference + action — `metadata.id` ใช้สร้าง URL deep-link */
  metadata?: NotificationMetadata;
  is_read?: boolean;
  is_sent?: boolean;
  scheduled_at?: string | null;
  created_at: string;
  from_user_id?: string;
  to_user_id?: string;
  /** Optional explicit URL fallback (ปกติไม่ใช้ — pre-built link จาก backend) */
  link?: string;
}
