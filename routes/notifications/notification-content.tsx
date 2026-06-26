import { useState } from "react";
import Link from "@/lib/compat/link";
import { useLocale, useTranslations } from "use-intl";
import { Bell, BellOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import EmptyComponent from "@/components/empty-component";
import { NotificationDetailDialog } from "@/components/navbar/notification";
import { NotificationItemContent } from "@/components/navbar/notification-item-content";
import { useNotificationsList } from "@/hooks/use-notification";
import { getNotificationHref } from "@/lib/notification-helpers";
import { cn, safeNavigationHref } from "@/lib/utils";
import type { Notification } from "@/types/notification";
import { NotificationLoader } from "@/components/loader/noti-loader";

export default function NotificationsContent() {
  const t = useTranslations("navbar");
  const locale = useLocale();
  const { data: items = [], isLoading, error } = useNotificationsList();
  const [detailId, setDetailId] = useState<string | null>(null);

  const unreadCount = items.filter((n) => n.is_read === false).length;

  return (
    <div className="flex flex-col gap-3 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Flat header */}
      <header className="border-border/60 flex items-center gap-2 border-b pb-2">
        <Bell className="text-muted-foreground size-4" aria-hidden="true" />
        <h1 className="text-lg font-semibold tracking-tight">
          {t("notifications")}
        </h1>
        {items.length > 0 && (
          <Badge variant="secondary" size="sm" className="tabular-nums">
            {items.length.toLocaleString()}
          </Badge>
        )}
        {unreadCount > 0 && (
          <span className="text-primary ml-auto inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums">
            <span className="bg-primary size-1.5 rounded-full" />
            {unreadCount.toLocaleString()}
          </span>
        )}
      </header>

      {error && (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {/* Flat list — no shadow, thin border, dense rows */}
      <ul>
        {isLoading ? (
          <NotificationLoader />
        ) : items.length === 0 ? (
          <li className="px-4 py-12">
            <EmptyComponent
              icon={BellOff}
              title={t("noNotificationsTitle")}
              description={t("noNotificationsDesc")}
            />
          </li>
        ) : (
          items.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              locale={locale}
              onShowDetail={setDetailId}
            />
          ))
        )}
      </ul>

      <NotificationDetailDialog
        id={detailId}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}

interface NotificationRowProps {
  readonly notification: Notification;
  readonly locale: string;
  readonly onShowDetail: (id: string) => void;
}

function NotificationRow({
  notification,
  locale,
  onShowDetail,
}: NotificationRowProps) {
  const t = useTranslations("navbar");
  const safeLink = safeNavigationHref(getNotificationHref(notification));
  const isUnread = notification.is_read === false;

  const rowClass = cn(
    "group flex w-full gap-2.5 text-left transition-colors",
    "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
    isUnread && "bg-primary/[0.07]",
  );

  const body = (
    <NotificationItemContent
      notification={notification}
      isUnread={isUnread}
      locale={locale}
      unreadLabel={t("unread")}
      clampMessage
    />
  );

  return (
    <li>
      {safeLink ? (
        <Link href={safeLink} className={rowClass}>
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onShowDetail(notification.id)}
          className={cn(rowClass, "cursor-pointer")}
        >
          {body}
        </button>
      )}
    </li>
  );
}
