
import { WifiOff } from "lucide-react";
import { useTranslations } from "use-intl";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const t = useTranslations("errors");

  if (isOnline) return null;

  return (
    // text-black, not text-warning-foreground: that token is warning-coloured
    // text for a page background, so it turns light in dark mode — amber on
    // amber. --warning is light in both themes, so a dark label fits both.
    <div
      role="status"
      aria-live="polite"
      className="bg-warning border-warning/40 sticky top-0 z-50 flex items-center justify-center gap-2 border-b px-3 py-1.5 text-xs font-semibold text-black"
    >
      <WifiOff className="size-3.5" aria-hidden="true" />
      <span className="font-semibold">{t("offlineTitle")}</span>
      <span className="hidden text-black/75 sm:inline">
        — {t("offlineDesc")}
      </span>
    </div>
  );
}
