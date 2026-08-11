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
    <div className="fixed right-4 top-4 z-[100] w-[calc(100%-2rem)] max-w-sm animate-in slide-in-from-top-10 fade-in duration-500 ease-out sm:right-6 sm:top-6">
      <div
        role="alert"
        aria-live="polite"
        className="flex items-center justify-between gap-3 overflow-hidden rounded-2xl border border-primary/20 bg-background/80 p-3 shadow-2xl backdrop-blur-xl ring-1 ring-primary/10 transition-all hover:bg-background/90 hover:shadow-primary/5 sm:p-4"
      >
        <div className="flex items-center gap-3">
          <div className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Bell className="size-5" aria-hidden="true" />
            <span className="absolute right-2 top-2 size-2.5 rounded-full bg-destructive shadow-[0_0_0_2px_hsl(var(--background))]" />
            <span className="absolute right-2 top-2 size-2.5 animate-ping rounded-full bg-destructive" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground leading-tight tracking-tight">
              {t("notifications")}
            </span>
            <span className="text-muted-foreground text-xs font-medium mt-0.5">
              {unreadCount} {t("unread", { defaultValue: "Unread" })}
            </span>
          </div>
        </div>
        <Link
          to="/notifications"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-8 shrink-0 items-center justify-center rounded-xl px-4 text-xs font-semibold shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >
          {t("viewAllTooltip", { defaultValue: "View All" })}
        </Link>
      </div>
    </div>
  );
}
