import Link from "@/lib/compat/link";
import type {
  Notification as NotificationType,
  NotificationEntityType,
} from "@/types/notification";
import { safeNavigationHref } from "@/lib/utils";

export type NotificationBadgeVariant =
  | "info-light"
  | "warning-light"
  | "success-light"
  | "destructive-light";

/**
 * Base path ของ detail page ต่อ entity type ของ notification
 * Deep-link สุดท้าย = `${base}/${metadata.id}`
 */
export const ENTITY_ROUTES: Record<NotificationEntityType, string> = {
  PR: "/procurement/purchase-request",
  PO: "/procurement/purchase-order",
  SR: "/store-operation/store-requisition",
};

/**
 * Type guard ตรวจว่าค่า `type` เป็น entity type ที่ deep-link ได้
 *
 * @param t - notification type string
 * @returns true ถ้าเป็น "PR" / "PO" / "SR"
 */
export function isEntityType(t: string): t is NotificationEntityType {
  return t === "PR" || t === "PO" || t === "SR";
}

/**
 * Badge color variant per entity type
 * - PR → info (น้ำเงิน)
 * - PO → warning (เหลือง/ส้ม)
 * - SR → success (เขียว)
 * - อื่นๆ → info (fallback)
 *
 * @param type - notification.type
 * @returns variant name สำหรับ shadcn `<Badge>`
 */
export function getBadgeVariant(type: string): NotificationBadgeVariant {
  if (type === "PR") return "info-light";
  if (type === "PO") return "warning-light";
  if (type === "SR") return "success-light";
  return "info-light";
}

/**
 * Map entity type → metadata key ที่ backend ใช้เก็บ entity id
 * (backend ใส่ key เป็น `{type}_id` lowercase แทน generic `id`)
 */
const METADATA_ID_KEY: Record<NotificationEntityType, "po_id" | "pr_id" | "sr_id"> = {
  PO: "po_id",
  PR: "pr_id",
  SR: "sr_id",
};

/**
 * คืน href ที่ใช้ navigate เมื่อกด notification — ลำดับ priority:
 * 1. Entity deep-link (PR/PO/SR + entity id จาก `metadata.{po_id|pr_id|sr_id}`
 *    หรือ fallback `metadata.id`)
 * 2. `notification.link` (free-form URL จาก backend เช่น type=link)
 * 3. `undefined` → caller fallback ไปเปิด detail dialog แทน
 *
 * @param n - notification record
 * @returns href string หรือ undefined
 */
export function getNotificationHref(n: NotificationType): string | undefined {
  if (isEntityType(n.type) && n.metadata) {
    const idKey = METADATA_ID_KEY[n.type];
    const entityId = n.metadata[idKey] ?? n.metadata.id;
    if (entityId) return `${ENTITY_ROUTES[n.type]}/${entityId}`;
  }
  return n.link || undefined;
}

/**
 * แปลง markdown-style `[label](url)` ใน message ของ notification เป็น
 * `<Link>` (`safeNavigationHref` กรอง URL อันตรายออก)
 *
 * @param message - notification.message raw text (รับ null/undefined ได้ → คืน [])
 * @returns array ของ ReactNode (string + Link)
 */
export function formatMessage(message: string | null | undefined) {
  if (!message) return [];
  const parts = message.split(/(\[.*?\]\(.*?\))/g);
  return parts.map((part) => {
    const match = /^\[(.*?)\]\((.*?)\)$/.exec(part);
    if (match) {
      const safeHref = safeNavigationHref(match[2]);
      if (!safeHref) return match[1];
      return (
        <Link
          key={safeHref}
          href={safeHref}
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
