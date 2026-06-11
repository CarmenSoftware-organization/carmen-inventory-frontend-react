
import { useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  ExternalLink,
  SquareArrowOutUpRight,
} from "lucide-react";
import Link from "@/lib/compat/link";
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
  useNotification,
  useNotificationDetail,
} from "@/hooks/use-notification";
import { useProfile } from "@/hooks/use-profile";
import type { Notification as NotificationType } from "@/types/notification";
import EmptyComponent from "../empty-component";
import {
  cn,
  safeInternalHref,
  safeNavigationHref,
  sanitizeText,
} from "@/lib/utils";
import {
  formatMessage,
  getBadgeVariant,
  getNotificationHref,
} from "@/lib/notification-helpers";
import { NotificationItemContent } from "./notification-item-content";

interface NotificationItemProps {
  readonly notification: NotificationType;
  readonly onMarkAsRead: (id: string) => void;
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
  const locale = useLocale();
  // Row-overlay link ต้องเป็น internal path เท่านั้น (policy: internal-only)
  // safeInternalHref เป็น sanitizer เฉพาะทาง — รับเฉพาะ root-relative path
  // กัน open-redirect (CWE-601) ไม่มีทางคืน external/absolute URL
  // External link (เช่น n.link เป็น https://) จะ fall ไปเปิด detail dialog ที่มีปุ่ม
  // "Open" แยก (กรอง URL ผ่าน safeNavigationHref อีกชั้น)
  const safeLink = safeInternalHref(getNotificationHref(notification));
  const safeTitle = sanitizeText(notification.title);
  const isUnread = notification.is_read === false;
  return (
    <div
      className={cn(
        "group hover:bg-muted/50 relative flex items-start gap-3 p-4 transition-colors",
        isUnread && "bg-primary/[0.07]",
      )}
    >
      {safeLink ? (
        <Link
          href={safeLink}
          onClick={() => {
            onMarkAsRead(notification.id);
            onNavigate();
          }}
          aria-label={safeTitle}
          className="absolute inset-0 z-10 border-b"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            onMarkAsRead(notification.id);
            onShowDetail(notification.id);
          }}
          aria-label={safeTitle}
          className="absolute inset-0 z-10 cursor-pointer border-b"
        />
      )}
      <NotificationItemContent
        notification={notification}
        isUnread={isUnread}
        locale={locale}
        unreadLabel={t("unread")}
      />
      <button
        onClick={() => onMarkAsRead(notification.id)}
        className="text-muted-foreground hover:text-foreground relative z-20 mt-1 opacity-0 transition-opacity group-hover:opacity-100"
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
  const { notifications, markAsRead, markAllAsRead } = useNotification(userId);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const notificationCount = notifications.length;

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
              <span
                aria-hidden="true"
                className="bg-destructive/40 absolute -inset-e-1 -top-1 size-4 rounded-full"
              />
              <span className="from-destructive to-destructive/80 ring-background absolute -inset-e-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-linear-to-br px-1 text-[0.5625rem] font-semibold text-white shadow-sm ring-2">
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
        <div className="from-primary/5 relative flex items-center justify-between border-b bg-linear-to-br via-transparent to-transparent px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="from-primary to-primary/70 text-primary-foreground relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-linear-to-br shadow-sm">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/20 to-transparent"
              />
              <Bell className="relative size-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              {t("notifications")}
            </span>
            {notificationCount > 0 && (
              <span className="bg-primary/10 text-primary inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.625rem] font-semibold">
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
                onClick={markAllAsRead}
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
                    href="/notifications"
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

        <div className="max-h-112 divide-y overflow-y-auto">
          {notifications.length === 0 ? (
            <EmptyComponent
              icon={BellOff}
              title={t("noNotificationsTitle")}
              description={t("noNotificationsDesc")}
              classNames="py-10"
            />
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onShowDetail={handleShowDetail}
                onNavigate={() => setPopoverOpen(false)}
                dismissLabel={t("dismiss")}
              />
            ))
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
  const t = useTranslations("navbar");
  const { data, isLoading, error } = useNotificationDetail(id);
  const open = !!id;

  const externalHref = data ? safeNavigationHref(data.link) : undefined;

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isLoading ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              sanitizeText(data?.title)
            )}
          </DialogTitle>
          {data && (
            <DialogDescription className="flex items-center gap-2 pt-1 text-[0.6875rem]">
              <Badge variant={getBadgeVariant(data.type)} size="xs">
                {data.type}
              </Badge>
              <span className="text-muted-foreground tabular-nums">
                {new Date(data.created_at).toLocaleString()}
              </span>
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-2 text-sm">
          {isLoading && (
            <>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </>
          )}
          {error && (
            <p className="text-destructive">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          {data && (
            <p className="leading-relaxed whitespace-pre-wrap">
              {formatMessage(data.message)}
            </p>
          )}
        </div>

        <DialogFooter>
          {externalHref && (
            <Button asChild variant="outline" size="sm">
              <Link href={externalHref} onClick={onClose}>
                <ExternalLink className="size-3.5" aria-hidden="true" />
                {t("open")}
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            {tc("close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
