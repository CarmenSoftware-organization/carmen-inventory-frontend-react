
import { WifiOff } from "lucide-react";
import { useTranslations } from "use-intl";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const t = useTranslations("errors");

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-warning text-warning-foreground border-warning/40 sticky top-0 z-50 flex items-center justify-center gap-2 border-b px-3 py-1.5 text-xs font-semibold"
    >
      <WifiOff className="size-3.5" aria-hidden="true" />
      <span className="font-semibold">{t("offlineTitle")}</span>
      <span className="text-warning-foreground/80 hidden sm:inline">
        — {t("offlineDesc")}
      </span>
    </div>
  );
}
