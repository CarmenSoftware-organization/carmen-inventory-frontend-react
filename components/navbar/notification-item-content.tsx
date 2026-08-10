import { Bell, MessageSquare } from "lucide-react";
import { SubTile } from "@/components/icons/tiles";
import { formatMessage, NOTIFICATION_TILE } from "@/lib/notification-helpers";
import { cn, sanitizeText } from "@/lib/utils";
import type { Notification } from "@/types/notification";

interface NotificationItemContentProps {
  readonly notification: Notification;
  readonly isUnread: boolean;
  /** Active locale — drives a single, shared timestamp format across navbar + page */
  readonly locale: string;
  /** Accessible label for the unread state (e.g. t("unread")) — pairs with the color dot */
  readonly unreadLabel: string;
  /**
   * ป้ายกำกับตราคอมเมนต์ (เช่น t("notifications.commentLabel")) — คู่กับไอคอน
   * optional ชั่วคราว: `routes/notifications/notification-content.tsx` (Task 3)
   * ยังไม่ส่ง prop นี้มาจนกว่าจะต่อสายใน Task 3 — required ในทางปฏิบัติสำหรับ
   * ผู้เรียกที่อัปเดตแล้ว (`components/navbar/notification.tsx`)
   * เมื่อไม่มีค่า ตราคอมเมนต์ทั้งก้อนจะไม่ขึ้นเลย (ไม่ใช่ขึ้นแบบไม่มีป้ายกำกับ)
   * กัน control ที่ screen reader อ่านไม่ได้
   */
  readonly commentLabel?: string;
  /** Clamp message to 2 lines (page list) vs single dense line (navbar dropdown) */
  readonly clampMessage?: boolean;
}

/**
 * Presentational row content shared by the navbar dropdown and the notifications
 * page. Renders as flex children (dot + content block) — the caller supplies the
 * flex wrapper and any interaction (overlay link, mark-as-read button, etc.).
 * Title underlines on `group-hover`, so the wrapper must carry the `group` class.
 */
export function NotificationItemContent({
  notification,
  isUnread,
  locale,
  unreadLabel,
  commentLabel,
  clampMessage = false,
}: NotificationItemContentProps) {
  const time = notification.created_at
    ? new Date(notification.created_at).toLocaleString(locale, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const tile = notification.doc_type
    ? NOTIFICATION_TILE[notification.doc_type]
    : undefined;
  const isComment = notification.event === "comment";

  return (
    <>
      {/* Unread rail — blue dot to the left of the icon (iOS style) */}
      <span
        className="flex w-1.5 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {isUnread && <span className="bg-primary size-1.5 rounded-full" />}
      </span>

      {/* Leading app tile — squircle ชุดเดียวกับ sidebar/dashboard
          doc_type ที่ไม่ใช่เอกสาร (system/business_unit) ตกมาที่กระดิ่ง
          event=comment ติดตราเล็กมุมล่างขวาแทนการเพิ่มบรรทัดข้อความ */}
      <span className="relative flex shrink-0 items-center">
        {tile ? (
          <SubTile name={tile.name} parentName={tile.parent} size={36} />
        ) : (
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Bell className="size-4.5" />
          </span>
        )}
        {isComment && commentLabel && (
          <span className="bg-background ring-border absolute -end-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full ring-1">
            <MessageSquare
              className="text-muted-foreground size-2.5"
              aria-hidden="true"
            />
            <span className="sr-only">{commentLabel}</span>
          </span>
        )}
      </span>

      {/* Content + inset bottom border (divider stops short of the icon) */}
      <div className="min-w-0 flex-1 border-b py-2">
        {/* Top line: type + title (left) · time (right) */}
        <div className="flex items-center gap-2">
          {isUnread && <span className="sr-only">{unreadLabel}</span>}
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-sm leading-snug group-hover:underline",
              isUnread ? "text-foreground font-semibold" : "font-semibold",
            )}
          >
            {sanitizeText(notification.title)}
          </p>
          {time && (
            <span className="text-muted-foreground shrink-0 text-micro whitespace-nowrap tabular-nums">
              {time}
            </span>
          )}
        </div>

        {/* Message */}
        <p
          className={cn(
            "text-muted-foreground mt-1 text-xs leading-snug",
            // page list → 2 lines; navbar dropdown → single line + ellipsis
            clampMessage ? "line-clamp-2" : "truncate",
          )}
        >
          {formatMessage(notification.message)}
        </p>
      </div>
    </>
  );
}
