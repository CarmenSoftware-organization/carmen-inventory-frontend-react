import { Bell } from "lucide-react";
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
  clampMessage = false,
}: NotificationItemContentProps) {
  const time = new Date(notification.created_at).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const tile = NOTIFICATION_TILE[notification.type];

  return (
    <>
      {/* Unread rail — blue dot to the left of the icon (iOS style) */}
      <span
        className="flex w-1.5 shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {isUnread && <span className="bg-primary size-1.5 rounded-full" />}
      </span>

      {/* Leading app tile — same illustrated squircle as the sidebar/dashboard,
          so a notification's icon matches its module exactly. Non-entity types
          fall back to a flat primary Bell tile. */}
      <span className="flex shrink-0 items-center">
        {tile ? (
          <SubTile name={tile.name} parentName={tile.parent} size={36} />
        ) : (
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
            <Bell className="size-4.5" />
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
          <span className="text-muted-foreground shrink-0 text-[0.6875rem] whitespace-nowrap tabular-nums">
            {time}
          </span>
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
