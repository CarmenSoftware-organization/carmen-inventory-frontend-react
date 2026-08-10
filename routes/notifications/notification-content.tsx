import { useState } from "react";
import { Link } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmptyComponent from "@/components/empty-component";
import { NotificationDetailDialog } from "@/components/navbar/notification";
import { NotificationItemContent } from "@/components/navbar/notification-item-content";
import {
  useMarkAllNotificationsRead,
  useNotificationsList,
  type NotificationTab,
} from "@/hooks/use-notification";
import { getNotificationHref } from "@/lib/notification-helpers";
import { cn, safeInternalHref } from "@/lib/utils";
import type { Notification } from "@/types/notification";
import { NotificationLoader } from "@/components/loader/noti-loader";

export default function NotificationsContent() {
  const t = useTranslations("navbar");
  const tRoot = useTranslations();
  const locale = useLocale();
  const [tab, setTab] = useState<NotificationTab>("all");
  const {
    items,
    total,
    summary,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useNotificationsList(tab);
  const markAllRead = useMarkAllNotificationsRead();
  const [detailId, setDetailId] = useState<string | null>(null);

  // แท็บ "ทั้งหมด" ให้ summary.unread มา ส่วนแท็บ "ยังไม่อ่าน" ไม่มี summary
  // โดยตั้งใจ (จำนวนยังไม่อ่าน = paginate.total ของ endpoint นั้นพอดี)
  // summary หายไป = "นับไม่ได้" ไม่ใช่ศูนย์ — undefined จึงต่างจาก 0 อย่างมีความหมาย
  const unreadCount: number | undefined =
    tab === "unread" ? total : summary?.unread;
  // แสดงปุ่ม/ป้ายเมื่อ "รู้ว่ามี" หรือ "ไม่รู้" (undefined) — ซ่อนเฉพาะเมื่อรู้แน่ว่าเป็นศูนย์
  const hasUnread = unreadCount !== 0;

  return (
    <div className="flex flex-col gap-3 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="border-border/60 flex flex-wrap items-center gap-2 border-b pb-2">
        <Bell className="text-muted-foreground size-4" aria-hidden="true" />
        <h1 className="text-lg font-semibold tracking-tight">
          {t("notifications")}
        </h1>
        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as NotificationTab)}
          className="ms-2"
        >
          <TabsList>
            <TabsTrigger value="all">{tRoot("notifications.tabAll")}</TabsTrigger>
            <TabsTrigger value="unread">
              {tRoot("notifications.tabUnread")}
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="ms-1.5 tabular-nums">
                  {unreadCount.toLocaleString()}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {hasUnread && (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground ms-auto h-7 text-xs"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            {tRoot("notifications.markAllRead")}
          </Button>
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
              title={
                tab === "unread"
                  ? tRoot("notifications.emptyUnreadTitle")
                  : t("noNotificationsTitle")
              }
              description={
                tab === "unread"
                  ? tRoot("notifications.emptyUnreadDesc")
                  : t("noNotificationsDesc")
              }
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

      {hasNextPage && (
        <div className="flex justify-center pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
          >
            {tRoot("notifications.loadMore")}
          </Button>
        </div>
      )}

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
  const tRoot = useTranslations();
  const safeLink = safeInternalHref(getNotificationHref(notification));
  const isUnread = notification.is_read === false;

  const rowClass = cn(
    "group flex w-full gap-3 text-left transition-colors",
    "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none",
    isUnread && "bg-primary/[0.07]",
  );

  const body = (
    <NotificationItemContent
      notification={notification}
      isUnread={isUnread}
      locale={locale}
      unreadLabel={t("unread")}
      commentLabel={tRoot("notifications.commentLabel")}
      clampMessage
    />
  );

  return (
    <li>
      {safeLink ? (
        <Link to={safeLink} className={rowClass}>
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
