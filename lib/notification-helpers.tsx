import { Link } from "react-router";
import type {
  Notification as NotificationType,
  NotificationDocType,
  NotificationMetadata,
} from "@/types/notification";
import { safeNavigationHref } from "@/lib/utils";

/**
 * doc_type → base path ของหน้ารายละเอียด
 * `null` = ไม่มีหน้าให้ลิงก์ไป (ประกาศระบบ/หน่วยธุรกิจ) → ผู้เรียกเปิด detail dialog แทน
 */
export const DOC_TYPE_ROUTES: Record<NotificationDocType, string | null> = {
  system: null,
  business_unit: null,
  purchase_request: "/procurement/purchase-request",
  purchase_order: "/procurement/purchase-order",
  good_received_note: "/procurement/goods-receive-note",
  credit_note: "/procurement/credit-note",
  store_requisition: "/store-operation/store-requisition",
};

/**
 * doc_type → คีย์ i18n แบบเต็ม (ใช้กับ `useTranslations()` ที่ไม่ระบุ namespace)
 * ชื่อเอกสารยืมจาก namespace `modules` เพื่อให้ตรงกับเมนูเป๊ะ ๆ ไม่แปลซ้ำ
 */
export const DOC_TYPE_LABEL_KEY: Record<NotificationDocType, string> = {
  system: "notifications.docType.system",
  business_unit: "notifications.docType.businessUnit",
  purchase_request: "modules.purchaseRequest",
  purchase_order: "modules.purchaseOrder",
  good_received_note: "modules.goodsReceiveNote",
  credit_note: "modules.creditNote",
  store_requisition: "modules.storeRequisition",
};

export interface NotificationTileRef {
  /** SubTile glyph key (ชื่อ submodule ใน module-list) */
  readonly name: string;
  /** Parent module name → กำหนดจานสีของ tile */
  readonly parent: string;
}

/**
 * Illustrated app-tile (SubTile) ต่อ doc_type — squircle ชุดเดียวกับ sidebar/dashboard
 * doc_type ที่ไม่มีในนี้ (`system`, `business_unit`) ตกไปที่ tile กระดิ่ง
 */
export const NOTIFICATION_TILE: Partial<
  Record<NotificationDocType, NotificationTileRef>
> = {
  purchase_request: { name: "purchaseRequest", parent: "procurement" },
  purchase_order: { name: "purchaseOrder", parent: "procurement" },
  good_received_note: { name: "goodsReceiveNote", parent: "procurement" },
  credit_note: { name: "creditNote", parent: "procurement" },
  store_requisition: { name: "storeRequisition", parent: "storeOperations" },
};

/**
 * คีย์ metadata เก่าต่อ doc_type — ใช้เป็น fallback สำหรับแถวที่เขียนก่อน redesign
 * write path ปัจจุบันเขียน id เอกสารไว้ที่ `metadata.id` เสมอ
 */
const LEGACY_ID_KEY: Partial<
  Record<NotificationDocType, keyof NotificationMetadata>
> = {
  purchase_request: "pr_id",
  purchase_order: "po_id",
  store_requisition: "sr_id",
  good_received_note: "grn_id",
  credit_note: "cn_id",
};

/**
 * คืน href ที่ใช้ navigate เมื่อกดการแจ้งเตือน
 * ลำดับ: route ของ doc_type + (`metadata.id` → คีย์เก่าตาม doc_type) มิฉะนั้น undefined
 * (ผู้เรียก fallback ไปเปิด detail dialog)
 *
 * @param n - แถวการแจ้งเตือน
 * @returns path ภายในแอป หรือ undefined เมื่อไม่มีเอกสารให้เปิด
 */
export function getNotificationHref(n: NotificationType): string | undefined {
  if (!n.doc_type) return undefined;
  const base = DOC_TYPE_ROUTES[n.doc_type];
  if (!base || !n.metadata) return undefined;
  const legacyKey = LEGACY_ID_KEY[n.doc_type];
  const legacyId = legacyKey ? n.metadata[legacyKey] : undefined;
  const entityId = n.metadata.id ?? legacyId;
  return typeof entityId === "string" && entityId
    ? `${base}/${encodeURIComponent(entityId)}`
    : undefined;
}

/**
 * แปลง markdown-style `[label](url)` ใน message เป็น `<Link>`
 * (`safeNavigationHref` กรอง URL อันตรายออก)
 *
 * @param message - ข้อความดิบ (รับ null/undefined ได้ → คืน [])
 * @returns array ของ ReactNode
 */
export function formatMessage(message: string | null | undefined) {
  if (!message) return [];
  const parts = message.split(/(\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    const match = /^\[(.*?)\]\((.*?)\)$/.exec(part);
    if (match) {
      const safeHref = safeNavigationHref(match[2]);
      if (!safeHref) return match[1];
      return (
        <Link
          key={index}
          to={safeHref}
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80 font-medium underline underline-offset-2"
          onClick={(e) => e.stopPropagation()}
        >
          {match[1]}
        </Link>
      );
    }
    return part;
  });
}
