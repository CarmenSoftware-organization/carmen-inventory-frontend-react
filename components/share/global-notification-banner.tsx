import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { useProfile } from "@/hooks/use-profile";
import { useUnreadNotifications } from "@/hooks/use-notification";

export function GlobalNotificationBanner() {
  const { isError } = useProfile();
  const { unreadCount } = useUnreadNotifications();
  const t = useTranslations("navbar");

  const [isVisible, setIsVisible] = useState(false);
  const [prevCount, setPrevCount] = useState(unreadCount);

  // Derive state during render to avoid cascading renders in useEffect
  if (unreadCount > prevCount) {
    setPrevCount(unreadCount);
    setIsVisible(true);
  } else if (unreadCount < prevCount) {
    setPrevCount(unreadCount);
    if (unreadCount === 0) setIsVisible(false);
  }

  useEffect(() => {
    if (isVisible && unreadCount > 0) {
      const timer = setTimeout(() => setIsVisible(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, unreadCount]);

  if (isError || unreadCount === 0 || !isVisible) return null;

  return (
    <div className="animate-in slide-in-from-top-10 fade-in fixed top-4 right-4 z-100 w-[calc(100%-2rem)] max-w-sm duration-500 ease-out sm:top-6 sm:right-6">
      <div
        role="alert"
        aria-live="polite"
        className="border-primary/20 bg-background/80 ring-primary/10 hover:bg-background/90 hover:shadow-primary/5 flex cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-2xl border p-3 shadow-2xl ring-1 backdrop-blur-xl transition-all sm:p-4"
        onClick={() => setIsVisible(false)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-primary/15 text-primary relative flex size-10 shrink-0 items-center justify-center rounded-full">
            <Bell className="size-5" aria-hidden="true" />
            <span className="bg-destructive absolute top-2 right-2 size-2.5 rounded-full shadow-[0_0_0_2px_hsl(var(--background))]" />
            <span className="bg-destructive absolute top-2 right-2 size-2.5 animate-ping rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="text-foreground text-sm leading-tight font-bold tracking-tight">
              {t("notifications")}
            </span>
            <span className="text-muted-foreground mt-0.5 text-xs font-medium">
              {unreadCount} {t("unread", { defaultValue: "Unread" })}
            </span>
          </div>
        </div>
        <Link
          to="/notifications"
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-8 shrink-0 items-center justify-center rounded-xl px-4 text-xs font-semibold shadow-sm transition-transform focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none active:scale-95"
        >
          {t("viewAllTooltip", { defaultValue: "View All" })}
        </Link>
      </div>
    </div>
  );
}
