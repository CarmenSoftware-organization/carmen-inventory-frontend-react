import { useState } from "react";
import { Link } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import { Bell, BellOff, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmptyComponent from "@/components/empty-component";
import { NotificationDetailDialog } from "@/components/navbar/notification";
import { NotificationItemContent } from "@/components/navbar/notification-item-content";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
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
  const markRead = useMarkNotificationRead();
  const [detailId, setDetailId] = useState<string | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleSelectionMode = () => {
    setIsSelectionMode((prev) => !prev);
    setSelectedIds(new Set()); // Clear selection when toggling
  };

  const handleSelectNotification = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkMarkAsRead = () => {
    if (selectedIds.size === 0) return;
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    selectedItems.forEach(item => {
      if (item.is_read === false) {
        markRead.mutate({ id: item.id, source: item.source });
      }
    });
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleMarkAsRead = (notification: Notification) =>
    markRead.mutate({ id: notification.id, source: notification.source });

  // แท็บ "ทั้งหมด" ให้ summary.unread มา ส่วนแท็บ "ยังไม่อ่าน" ไม่มี summary
  // โดยตั้งใจ (จำนวนยังไม่อ่าน = paginate.total ของ endpoint นั้นพอดี)
  // summary หายไป = "นับไม่ได้" ไม่ใช่ศูนย์ — undefined จึงต่างจาก 0 อย่างมีความหมาย
  const unreadCount: number | undefined =
    tab === "unread" ? total : summary?.unread;
  // แสดงปุ่ม/ป้ายเมื่อ "รู้ว่ามี" หรือ "ไม่รู้" (undefined) — ซ่อนเฉพาะเมื่อรู้แน่ว่าเป็นศูนย์
  const hasUnread = unreadCount !== 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 pb-[max(2rem,env(safe-area-inset-bottom))] md:py-8">
      <header className="flex flex-wrap items-center gap-3 pb-2">
        <div className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-2xl shadow-sm">
          <Bell className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("notifications")}
        </h1>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            // Check if document.startViewTransition is supported for smooth tab switching
            if (document.startViewTransition) {
              document.startViewTransition(() => setTab(value as NotificationTab));
            } else {
              setTab(value as NotificationTab);
            }
          }}
          className="ms-4"
        >
          <TabsList className="bg-muted/50 rounded-xl p-1">
            <TabsTrigger value="all" className="rounded-lg data-[state=active]:shadow-sm">{tRoot("notifications.tabAll")}</TabsTrigger>
            <TabsTrigger value="unread" className="rounded-lg data-[state=active]:shadow-sm">
              {tRoot("notifications.tabUnread")}
              {unreadCount !== undefined && unreadCount > 0 && (
                <span className="bg-primary/15 text-primary ms-2 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums">
                  {unreadCount.toLocaleString()}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        {hasUnread && (
          <div className="ms-auto flex gap-2">
            <Button
              variant={isSelectionMode ? "default" : "outline"}
              size="sm"
              className="h-9 rounded-xl text-xs font-medium transition-all"
              onClick={handleToggleSelectionMode}
            >
              <CheckSquare className="mr-1.5 size-3.5" />
              {isSelectionMode ? "Cancel" : "Select"}
            </Button>
            {!isSelectionMode && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-xl text-xs font-medium transition-all hover:bg-muted"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                {tRoot("notifications.markAllRead")}
              </Button>
            )}
          </div>
        )}
      </header>

      {error && (
        <p className="text-destructive text-sm">
          {error instanceof Error ? error.message : String(error)}
        </p>
      )}

      {/* Card list layout with view transition support */}
      <div className="flex flex-col gap-6 pb-2" style={{ viewTransitionName: 'notification-list' }}>
        {isLoading ? (
          <div className="bg-card/40 rounded-3xl p-6 shadow-sm ring-1 ring-border/50 backdrop-blur-md">
            <NotificationLoader />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-card/40 flex items-center justify-center rounded-3xl px-4 py-20 shadow-sm ring-1 ring-border/50 backdrop-blur-md">
            <EmptyComponent
              icon={BellOff}
              title={
                tab === "unread"
                  ? tRoot("notifications.emptyUnreadTitle")
                  : t("noNotificationsTitle")
              }
              description={
                tab === "unread" ? (
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">{tRoot("notifications.emptyUnreadDesc")}</p>
                    <Button variant="outline" size="sm" onClick={() => setTab("all")}>
                      View All Notifications
                    </Button>
                  </div>
                ) : (
                  t("noNotificationsDesc")
                )
              }
            />
          </div>
        ) : (
          <>
            {items.filter(i => i.source === "broadcast").length > 0 && (
              <section>
                <h2 className="text-muted-foreground mb-3 px-1 text-sm font-semibold uppercase tracking-wider">
                  {tRoot("notifications.broadcasts", { defaultValue: "Broadcasts" })}
                </h2>
                <ul className="flex flex-col gap-3">
                  {items
                    .filter((notification) => notification.source === "broadcast")
                    .map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        locale={locale}
                        onShowDetail={setDetailId}
                        onMarkRead={handleMarkAsRead}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedIds.has(notification.id)}
                        onToggleSelect={handleSelectNotification}
                      />
                    ))}
                </ul>
              </section>
            )}

            {(() => {
              const personalItems = items.filter(i => i.source !== "broadcast");
              if (personalItems.length === 0) return null;

              const groupedByBu = personalItems.reduce((acc, item) => {
                const bu = item.metadata?.bu ? String(item.metadata.bu) : tRoot("notifications.personal", { defaultValue: "Personal" });
                if (!acc[bu]) acc[bu] = [];
                acc[bu].push(item);
                return acc;
              }, {} as Record<string, Notification[]>);

              return Object.entries(groupedByBu).map(([buName, buItems]) => (
                <section key={buName}>
                  <h2 className="text-muted-foreground mb-3 px-1 text-sm font-semibold uppercase tracking-wider">
                    {buName}
                  </h2>
                  <ul className="flex flex-col gap-3">
                    {buItems.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        locale={locale}
                        onShowDetail={setDetailId}
                        onMarkRead={handleMarkAsRead}
                        isSelectionMode={isSelectionMode}
                        isSelected={selectedIds.has(notification.id)}
                        onToggleSelect={handleSelectNotification}
                      />
                    ))}
                  </ul>
                </section>
              ));
            })()}
          </>
        )}
      </div>

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

      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border bg-card px-6 py-3 shadow-lg animate-in slide-in-from-bottom-5">
          <span className="text-sm font-semibold">{selectedIds.size} Selected</span>
          <Button size="sm" onClick={handleBulkMarkAsRead} className="rounded-full">Mark as Read</Button>
        </div>
      )}
    </div>
  );
}

interface NotificationRowProps {
  readonly notification: Notification;
  readonly locale: string;
  readonly onShowDetail: (id: string) => void;
  readonly onMarkRead: (notification: Notification) => void;
  readonly isSelectionMode?: boolean;
  readonly isSelected?: boolean;
  readonly onToggleSelect?: (id: string) => void;
}

function NotificationRow({
  notification,
  locale,
  onShowDetail,
  onMarkRead,
  isSelectionMode,
  isSelected,
  onToggleSelect,
}: NotificationRowProps) {
  const t = useTranslations("navbar");
  const tRoot = useTranslations();
  const safeLink = safeInternalHref(getNotificationHref(notification));
  const isUnread = notification.is_read === false;

  let severityBg = "bg-card/40 ring-border/50 hover:bg-card/80 hover:ring-border/80 hover:border-primary/20";
  if (notification.source === "broadcast") {
    const sev = String(notification.metadata?.severity || "INFO").toUpperCase();
    if (sev === "WARNING") {
      severityBg = "bg-warning/10 ring-warning/20 hover:bg-warning/15 hover:ring-warning/40 hover:border-warning/30";
    } else if (sev === "CRITICAL") {
      severityBg = "bg-destructive/10 ring-destructive/20 hover:bg-destructive/15 hover:ring-destructive/40 hover:border-destructive/30";
    } else if (sev === "MAINTENANCE") {
      severityBg = "bg-muted-foreground/10 ring-muted-foreground/20 hover:bg-muted-foreground/15 hover:ring-muted-foreground/40 hover:border-muted-foreground/30";
    } else if (sev === "INFO") {
      severityBg = "bg-info/10 ring-info/20 hover:bg-info/15 hover:ring-info/40 hover:border-info/30";
    }
  }

  const rowClass = cn(
    "group flex w-full items-center gap-4 text-left transition-all duration-300 ease-out",
    "rounded-2xl p-4 border border-transparent backdrop-blur-xl shadow-sm ring-1",
    "hover:scale-[1.01] hover:shadow-md",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    severityBg,
    isUnread && (notification.source === "broadcast" ? "ring-2" : "bg-primary/[0.04] ring-primary/15 hover:ring-primary/30"),
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
      {isSelectionMode ? (
        <button
          type="button"
          onClick={() => onToggleSelect?.(notification.id)}
          className={cn(rowClass, "cursor-pointer outline-none")}
        >
          <Checkbox checked={isSelected} className="pointer-events-none" />
          <div className="flex-1 min-w-0 flex items-center">{body}</div>
        </button>
      ) : safeLink ? (
        <Link
          to={safeLink}
          className={rowClass}
          onClick={() => onMarkRead(notification)}
        >
          {body}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => {
            onMarkRead(notification);
            onShowDetail(notification.id);
          }}
          className={cn(rowClass, "cursor-pointer")}
        >
          {body}
        </button>
      )}
    </li>
  );
}
