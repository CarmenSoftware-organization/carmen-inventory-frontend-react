import { useState } from "react";
import { Bell, BellOff, Check, SquareArrowOutUpRight, AlertCircle } from "lucide-react";
import { Link } from "react-router";
import { useLocale, useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
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
        "group relative flex items-start gap-3 rounded-xl p-3 pr-10 transition-all duration-300 ease-out border border-border/30",
        isUnread
          ? "bg-primary/[0.03] hover:bg-primary/[0.06] shadow-[inset_3px_0_0_0_hsl(var(--primary)),0_1px_3px_0_rgba(0,0,0,0.05)] hover:shadow-[inset_3px_0_0_0_hsl(var(--primary)),0_4px_6px_-1px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
          : "bg-background shadow-sm hover:shadow-md hover:bg-muted/30 hover:-translate-y-0.5",
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
        className="mx-4 max-h-136 w-108 overflow-hidden p-0 shadow-lg"
        align="end"
        sideOffset={6}
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
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
        showCloseButton={false}
        className="sm:max-w-[500px] overflow-hidden p-0 border border-border/30 shadow-2xl bg-background/95 backdrop-blur-2xl rounded-2xl"
      >
        {/* Glassmorphic decorative glowing orbs */}
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/20 blur-[64px] pointer-events-none" aria-hidden="true" />
        <div className="absolute -left-12 top-12 h-40 w-40 rounded-full bg-blue-500/10 blur-[48px] pointer-events-none" aria-hidden="true" />

        <div className="relative z-10 px-6 pt-8 pb-6">
          <DialogHeader className="flex flex-row items-start gap-5 space-y-0 text-left">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-b from-primary/10 to-primary/5 shadow-inner ring-1 ring-primary/20">
              <Bell className="h-7 w-7 text-primary/90" strokeWidth={1.5} />
              <div className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />
            </div>
            
            <div className="flex-1 space-y-2 pt-0">
              <DialogTitle className="text-[26px] font-bold tracking-tight text-foreground leading-tight">
                {isLoading ? (
                  <Skeleton className="h-8 w-4/5 rounded-lg" />
                ) : (
                  sanitizeText(data?.title)
                )}
              </DialogTitle>
              {data && (
                <DialogDescription className="flex flex-wrap items-center gap-3 pt-1">
                  {data.doc_type && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
                      {tRoot(DOC_TYPE_LABEL_KEY[data.doc_type])}
                    </Badge>
                  )}
                  {data.created_at && (
                    <span className="text-muted-foreground text-sm font-medium flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                      {new Date(data.created_at).toLocaleString(locale, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  )}
                </DialogDescription>
              )}
            </div>
          </DialogHeader>

          <div className="mt-8 rounded-2xl bg-muted/30 p-5 ring-1 ring-inset ring-border/50 shadow-sm backdrop-blur-sm">
            {isLoading && (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full rounded-md" />
                <Skeleton className="h-4 w-11/12 rounded-md" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
              </div>
            )}
            {error && (
              <div className="flex items-start gap-3 text-destructive rounded-xl bg-destructive/10 p-4">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <p className="font-medium text-[14.5px] leading-relaxed">
                  {error instanceof Error ? error.message : String(error)}
                </p>
              </div>
            )}
            {data && (
              <p className="text-[15px] leading-relaxed text-foreground/85 whitespace-pre-wrap">
                {formatMessage(data.message)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="relative z-10 bg-muted/20 border-t border-border/30 px-6 py-4 sm:justify-end">
          <Button 
            variant="default" 
            onClick={onClose} 
            className="w-full sm:w-auto rounded-xl px-8 h-11 text-[15px] font-medium shadow-[0_2px_12px_-4px_hsl(var(--primary))] hover:shadow-[0_6px_16px_-6px_hsl(var(--primary))] transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
          >
            {tc("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
