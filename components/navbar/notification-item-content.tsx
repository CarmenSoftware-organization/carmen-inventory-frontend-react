import { Badge } from "@/components/ui/badge";
import { formatMessage, getBadgeVariant } from "@/lib/notification-helpers";
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

  return (
    <>
      {/* Unread dot — reserves space on read rows so content stays aligned */}
      <span
        className="mt-1.5 flex w-2 shrink-0 justify-center"
        aria-hidden="true"
      >
        {isUnread && <span className="bg-primary size-2 rounded-full" />}
      </span>

      <div className="min-w-0 flex-1">
        {/* Top line: badge + title (left) · time (right) */}
        <div className="flex items-center gap-2">
          <Badge
            variant={getBadgeVariant(notification.type)}
            size="xs"
            className="shrink-0"
          >
            {notification.type}
          </Badge>
          {isUnread && <span className="sr-only">{unreadLabel}</span>}
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-sm leading-snug group-hover:underline",
              isUnread ? "text-foreground font-semibold" : "font-medium",
            )}
          >
            {sanitizeText(notification.title)}
          </p>
          <span className="text-muted-foreground shrink-0 whitespace-nowrap text-[0.6875rem] tabular-nums">
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
