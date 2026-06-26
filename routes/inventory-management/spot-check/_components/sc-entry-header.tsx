
import { useRouter } from "@/lib/compat/navigation";
import { ArrowLeft, Calendar, ClipboardCheck, MapPin } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { getSpotCheckMethodLabel } from "@/constant/spot-check-method";
import type { SpotCheckMethod, SpotCheckStatus } from "@/types/spot-check";
import { METHOD_VISUAL, STATUS_VISUAL } from "./sc-status-visual";

interface ScEntryHeaderProps {
  readonly locationName: string;
  readonly locationCode: string;
  readonly docStatus?: SpotCheckStatus;
  readonly method?: SpotCheckMethod;
  readonly startDate?: string | null;
  readonly countedCount: number;
  readonly totalItems: number;
  readonly percent: number;
}

export function ScEntryHeader({
  locationName,
  locationCode,
  docStatus,
  method,
  startDate,
  countedCount,
  totalItems,
  percent,
}: ScEntryHeaderProps) {
  const t = useTranslations("inventoryManagement.spotCheck");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const router = useRouter();
  const { dateFormat } = useProfile();

  const status = STATUS_VISUAL[docStatus ?? "pending"] ?? STATUS_VISUAL.pending;
  const methodVis = METHOD_VISUAL[method ?? "random"] ?? METHOD_VISUAL.random;
  const MethodIcon = methodVis.icon;
  const methodLabel = method ? getSpotCheckMethodLabel(t, method) : "";

  return (
    <div className="border-border/60 bg-card mb-3 rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/inventory-management/spot-check")}
            aria-label={tc("goBack")}
            className="mt-0.5 rounded-full"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-widest uppercase">
              <ClipboardCheck className="size-2.5" />
              {t("entryTitle")}
            </span>
            <h1 className="text-foreground mt-1 text-base leading-tight font-semibold tracking-tight">
              {locationName || "—"}
            </h1>
            <p className="text-muted-foreground mt-0.5 text-[0.625rem] tracking-wide uppercase">
              {locationCode}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {docStatus && (
            <Badge
              variant={status.variant}
              size="xs"
              className={cn(
                "gap-1 px-2 text-[0.5625rem] font-semibold tracking-wider uppercase",
                status.className,
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  status.dotClass,
                  status.pulse && "animate-pulse",
                )}
                aria-hidden="true"
              />
              {ts(docStatus)}
            </Badge>
          )}
          <p className="text-foreground mt-1 text-sm font-semibold tabular-nums">
            {countedCount}{" "}
            <span className="text-muted-foreground text-xs">
              / {totalItems}
            </span>
          </p>
          <p className="text-muted-foreground text-[0.625rem]">
            {t("percentComplete", { percent })}
          </p>
        </div>
      </div>

      <Progress value={percent} variant="auto" className="mt-3 h-1" />

      <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-3 text-[0.6875rem]">
        <span className="flex items-center gap-1">
          <MapPin className="size-2.5" aria-hidden="true" />
          {locationName}
        </span>
        <span className="flex items-center gap-1">
          <MethodIcon className="size-2.5" aria-hidden="true" />
          {methodLabel}
        </span>
        {startDate && (
          <span className="flex items-center gap-1">
            <Calendar className="size-2.5" aria-hidden="true" />
            {formatDate(startDate, dateFormat)}
          </span>
        )}
      </div>
    </div>
  );
}
