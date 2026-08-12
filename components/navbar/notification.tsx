import { useState } from "react";
import { Bell, BellOff, Check, SquareArrowOutUpRight, AlertCircle } from "lucide-react";
import { Link } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationDetail,
  useNotificationRealtime,
  useUnreadNotifications,
} from "@/hooks/use-notification";
import { useProfile } from "@/hooks/use-profile";
import type { Notification as NotificationType } from "@/types/notification";
import EmptyComponent from "../empty-component";
import { cn, safeInternalHref, sanitizeText } from "@/lib/utils";
import {
  formatMessage,
  getNotificationHref,
  DOC_TYPE_LABEL_KEY,
} from "@/lib/notification-helpers";
import { NotificationItemContent } from "./notification-item-content";

interface NotificationItemProps {
  readonly notification: NotificationType;
  readonly onMarkAsRead: (notification: NotificationType) => void;
  readonly onShowDetail: (id: string) => void;
  readonly onNavigate: () => void;
  readonly dismissLabel: string;
}

const NotificationItem = ({
  notification,
  onMarkAsRead,
  onShowDetail,
  onNavigate,
  dismissLabel,
}: NotificationItemProps) => {
  const t = useTranslations("navbar");
  const tRoot = useTranslations();
  const locale = useLocale();
  // safeInternalHref เป็นด่านกันเพิ่ม (defence-in-depth) เหนือค่าที่เป็น internal
  // path อยู่แล้วโดยโครงสร้าง — getNotificationHref คืนได้แค่ route คงที่ + id เท่านั้น
  // ไม่มีทางเป็น external URL แถวที่ไม่มีเอกสารให้เปิด (คืน undefined) จะ fall ไปเปิด
  // detail dialog แทน
  const safeLink = safeInternalHref(getNotificationHref(notification));
  const safeTitle = sanitizeText(notification.title);
  const isUnread = notification.is_read === false;
  return (
    <div
      className={cn(
        "group flex items-start gap-3 rounded-lg p-3 pr-10 transition-colors border backdrop-blur-sm",
        isUnread
          ? "bg-muted/50 border-border/50 hover:bg-muted/70"
          : "bg-background/40 border-transparent hover:bg-muted/30",
      )}
    >
      {safeLink ? (
        <Link
          to={safeLink}
          onClick={() => {
            onMarkAsRead(notification);
            onNavigate();
          }}
          aria-label={safeTitle || t("notifications")}
          className="absolute inset-0 z-10"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            onMarkAsRead(notification);
            onShowDetail(notification.id);
          }}
          aria-label={safeTitle || t("notifications")}
          className="absolute inset-0 z-10 cursor-pointer"
        />
      )}
      <NotificationItemContent
        notification={notification}
        isUnread={isUnread}
        locale={locale}
        unreadLabel={t("unread")}
        commentLabel={tRoot("notifications.commentLabel")}
      />
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMarkAsRead(notification);
        }}
        className="text-muted-foreground/60 hover:text-foreground hover:bg-background/80 absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full p-1.5 opacity-0 shadow-sm backdrop-blur-sm transition-all duration-300 group-hover:opacity-100"
        type="button"
        title={dismissLabel}
        aria-label={dismissLabel}
      >
        <Check className="size-4" />
      </button>
    </div>
  );
};

export default function Notification() {
  const t = useTranslations("navbar");
  const { userId } = useProfile();
  useNotificationRealtime(userId);
  const { notifications, unreadCount, isLoading } = useUnreadNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const notificationCount = unreadCount;

  const handleMarkAsRead = (notification: NotificationType) =>
    markRead.mutate({ id: notification.id, source: notification.source });

  const handleShowDetail = (id: string) => {
    setPopoverOpen(false);
    setDetailId(id);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="group hover:border-border/60 hover:bg-muted/50 data-[state=open]:border-border/60 data-[state=open]:bg-muted/60 relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-transparent"
          size="sm"
          aria-label={t("notifications")}
        >
          <Bell className="h-3.5 w-3.5 transition-transform group-hover:-rotate-12" />
          {notificationCount > 0 && (
            <>
              <span className="bg-destructive ring-background absolute -inset-e-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-micro-eyebrow font-semibold text-white ring-2">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="mx-4 w-108 max-h-136 p-0 bg-background/70 backdrop-blur-xl border-border/40 shadow-lg supports-[backdrop-filter]:bg-background/50"
        align="end"
        sideOffset={6}
      >
        <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 bg-background/20">
          <div className="flex items-center gap-2">
            <Bell className="text-muted-foreground size-4 shrink-0" />
            <span className="text-sm font-semibold tracking-tight">
              {t("notifications")}
            </span>
            {notificationCount > 0 && (
              <span className="bg-muted text-muted-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-micro-legal font-semibold tabular-nums">
                {notificationCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {notificationCount > 0 && (
              <Button
                variant="ghost"
                className="text-muted-foreground h-6 px-2 text-xs"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                {t("clearAll")}
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Link
                    to="/notifications"
                    aria-label={t("viewAllTooltip")}
                    onClick={() => setPopoverOpen(false)}
                  >
                    <SquareArrowOutUpRight />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("viewAllTooltip")}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="max-h-112 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : notifications.length === 0 ? (
            <EmptyComponent
              icon={BellOff}
              title={t("noNotificationsTitle")}
              description={t("noNotificationsDesc")}
              classNames="py-10"
            />
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onShowDetail={handleShowDetail}
                  onNavigate={() => setPopoverOpen(false)}
                  dismissLabel={t("dismiss")}
                />
              ))}
            </div>
          )}
        </div>
      </PopoverContent>

      <NotificationDetailDialog
        id={detailId}
        onClose={() => setDetailId(null)}
      />
    </Popover>
  );
}

interface NotificationDetailDialogProps {
  readonly id: string | null;
  readonly onClose: () => void;
}

export function NotificationDetailDialog({
  id,
  onClose,
}: NotificationDetailDialogProps) {
  const tc = useTranslations("common");
  const tRoot = useTranslations();
  const locale = useLocale();
  const { data, isLoading, error } = useNotificationDetail(id);
  const open = !!id;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent 
        className="sm:max-w-[425px] p-0 border-0 overflow-hidden bg-transparent shadow-2xl"
        showCloseButton={false}
      >
        <div className="relative overflow-hidden rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-3xl border border-white/80 dark:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
          {/* Header */}
          <div className="px-6 py-6 border-b border-white/60 dark:border-white/10 bg-white/60 dark:bg-black/40">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/90 dark:bg-white/10 text-primary shadow-sm border border-white/80 dark:border-white/20 backdrop-blur-md">
                <Bell className="h-6 w-6" />
              </div>
              <div className="flex flex-col text-left">
                <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  {isLoading ? <Skeleton className="h-5 w-3/4 bg-black/10 dark:bg-white/10" /> : data?.title}
                </DialogTitle>
                {data && (
                  <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center mt-1">
                    <span>{data.created_at ? new Date(data.created_at).toLocaleDateString(locale, { dateStyle: "medium" }) : ""}</span>
                    {data.doc_type && (
                      <span className="ml-2 before:content-['•'] before:mr-2 uppercase tracking-wider text-primary">
                        {tRoot(DOC_TYPE_LABEL_KEY[data.doc_type])}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 bg-white/50 dark:bg-black/40">
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full bg-black/10 dark:bg-white/10" />
                <Skeleton className="h-4 w-5/6 bg-black/10 dark:bg-white/10" />
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-3 text-sm font-semibold text-destructive bg-white/80 dark:bg-black/60 p-4 rounded-xl border border-white/60 dark:border-white/10 backdrop-blur-sm shadow-sm">
                <AlertCircle className="h-5 w-5" />
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {data && (
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {formatMessage(data.message)}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex justify-end border-t border-white/60 dark:border-white/10 bg-white/70 dark:bg-black/50">
            <Button 
              variant="outline" 
              onClick={onClose} 
              className="rounded-xl bg-white/90 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 border border-white/80 dark:border-white/20 font-bold backdrop-blur-md shadow-sm transition-all"
            >
              {tc("close")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
