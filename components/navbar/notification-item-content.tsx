import {
  Bell,
  MessageSquare,
  AlertTriangle,
  AlertCircle,
  Wrench,
  Info,
} from "lucide-react";
import { SubTile } from "@/components/icons/tiles";
import { formatMessage, NOTIFICATION_TILE } from "@/lib/notification-helpers";
import { formatRelativeTime } from "@/lib/relative-time";
import { cn, sanitizeText } from "@/lib/utils";
import type { Notification } from "@/types/notification";

interface NotificationItemContentProps {
  readonly notification: Notification;
  readonly isUnread: boolean;
  /** Active locale — drives a single, shared timestamp format across navbar + page */
  readonly locale: string;
  /** Accessible label for the unread state (e.g. t("unread")) — pairs with the color dot */
  readonly unreadLabel: string;
  /** ป้ายกำกับตราคอมเมนต์ (เช่น tRoot("notifications.commentLabel")) — คู่กับไอคอน */
  readonly commentLabel: string;
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
    ? formatRelativeTime(notification.created_at, locale)
    : null;
  const fullTime = notification.created_at
    ? new Date(notification.created_at).toLocaleString(locale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const tile = notification.doc_type
    ? NOTIFICATION_TILE[notification.doc_type]
    : undefined;
  const isComment = notification.event === "comment";

  let FallbackIcon = Bell;
  const fallbackBg = "bg-primary text-primary-foreground";

  if (!tile && notification.source === "broadcast") {
    const sev = String(notification.metadata?.severity || "INFO").toUpperCase();
    if (sev === "WARNING") {
      FallbackIcon = AlertTriangle;
    } else if (sev === "CRITICAL") {
      FallbackIcon = AlertCircle;
    } else if (sev === "MAINTENANCE") {
      FallbackIcon = Wrench;
    } else if (sev === "INFO") {
      FallbackIcon = Info;
    }
  }

  return (
    <>
      {/* Unread rail — blue dot to the left of the icon (iOS style) with glow */}
      <span
        className="flex w-2 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {isUnread && (
          <span className="bg-primary ring-primary/10 size-2 rounded-full shadow-[0_0_8px_hsl(var(--primary))] ring-4" />
        )}
      </span>

      {/* Leading app tile — squircle ชุดเดียวกับ sidebar/dashboard
          doc_type ที่ไม่ใช่เอกสาร (system/business_unit) ตกมาที่กระดิ่ง
          event=comment ติดตราเล็กมุมล่างขวาแทนการเพิ่มบรรทัดข้อความ */}
      <span className="relative flex shrink-0 items-center">
        {tile ? (
          <div className="rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110">
            <SubTile name={tile.name} parentName={tile.parent} size={36} />
          </div>
        ) : (
          <span
            className={cn(
              "flex size-9 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110",
              fallbackBg,
            )}
          >
            <FallbackIcon className="size-4.5" />
          </span>
        )}
        {isComment && (
          <span className="bg-background ring-border absolute -end-0.5 -bottom-0.5 flex size-4 items-center justify-center rounded-full ring-1">
            <MessageSquare
              className="text-muted-foreground size-2.5"
              aria-hidden="true"
            />
            <span className="sr-only">{commentLabel}</span>
          </span>
        )}
      </span>

      {/* Content + inset bottom border (removed for card layout) */}
      <div className="min-w-0 flex-1">
        {/* Top line: type + title (left) · time (right) */}
        <div className="flex items-center gap-2">
          {isUnread && <span className="sr-only">{unreadLabel}</span>}
          <div className="flex min-w-0 flex-1 items-center gap-2 truncate">
            <p
              className={cn(
                "group-hover:text-primary truncate text-sm leading-tight transition-colors duration-300",
                isUnread
                  ? "text-foreground font-semibold"
                  : "text-foreground/80 font-medium",
              )}
            >
              {sanitizeText(notification.title)}
            </p>
            {notification.metadata?.bu_code ? (
              <span className="bg-primary/10 text-primary text-micro-legal shrink-0 rounded-md px-1.5 py-0.5 font-bold tracking-wide uppercase">
                {notification.metadata.bu_code as string}
              </span>
            ) : null}
          </div>
          {time && (
            <span
              title={fullTime || undefined}
              className="text-muted-foreground text-micro shrink-0 cursor-default whitespace-nowrap tabular-nums"
            >
              {time}
            </span>
          )}
        </div>

        {/* Message */}
        <p
          className={cn(
            "text-muted-foreground/80 group-hover:text-muted-foreground mt-1 text-xs leading-relaxed transition-colors duration-300",
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
