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
        className="sm:max-w-[425px] p-6 gap-6 rounded-xl border border-border/60 bg-background shadow-md sm:rounded-2xl"
        showCloseButton={false}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30">
                <Bell className="h-4 w-4 text-foreground/80" strokeWidth={2} />
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-[15px] font-semibold text-foreground tracking-tight">
                  {isLoading ? <Skeleton className="h-4 w-32" /> : data?.title}
                </DialogTitle>
                {data && (
                  <div className="flex items-center gap-2 mt-0.5 text-[13px] text-muted-foreground">
                    <time dateTime={data.created_at ?? undefined}>{data.created_at ? new Date(data.created_at).toLocaleDateString(locale, { dateStyle: "medium" }) : ""}</time>
                    {data.doc_type && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-border" />
                        <span className="font-medium text-foreground/70">
                          {tRoot(DOC_TYPE_LABEL_KEY[data.doc_type])}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border/40 bg-muted/20 p-4">
            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            )}
            
            {error && (
              <div className="flex items-center gap-2 text-[13px] font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error instanceof Error ? error.message : String(error)}
              </div>
            )}

            {data && (
              <p className="text-[14px] leading-relaxed text-foreground/90 whitespace-pre-wrap">
                {formatMessage(data.message)}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={onClose}
            className="h-9 px-4 text-[13px] font-medium rounded-md shadow-sm transition-colors"
          >
            {tc("close")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
