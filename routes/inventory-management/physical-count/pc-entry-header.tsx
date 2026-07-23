import { useNavigate } from "react-router";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { STATUS_DOT_CHIP } from "@/constant/status-config";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface PcEntryHeaderProps {
  readonly locationName: string;
  readonly locationCode: string;
  readonly status?: string | null;
  readonly countedCount: number;
  readonly totalItems: number;
  readonly percent: number;
  readonly startCountingAt?: string | null;
  readonly lastSaved?: string | null;
}

export function PcEntryHeader({
  locationName,
  locationCode,
  status,
  countedCount,
  totalItems,
  percent,
  startCountingAt,
  lastSaved,
}: PcEntryHeaderProps) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const tc = useTranslations("common");
  const navigate = useNavigate();

  return (
    <div className="border-border/60 bg-card mb-3 rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => navigate("/inventory-management/physical-count")}
            aria-label={tc("goBack")}
            className="mt-0.5 rounded-full hover:bg-transparent dark:hover:bg-transparent"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-foreground mt-1 text-base leading-tight font-semibold tracking-tight">
                {locationName || "—"}
              </h1>
              <Badge size="xs" className={`${STATUS_DOT_CHIP} before:bg-info`}>
                {status ?? t("tabInProgress")}
              </Badge>
            </div>

            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-2 text-[0.625rem] tracking-wide uppercase">
              <p>{locationCode}</p>
              {startCountingAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="size-2.5" aria-hidden="true" />
                  {new Date(startCountingAt).toLocaleDateString()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="size-2.5" aria-hidden="true" />
                {t("lastSaved", { time: lastSaved ?? "--:--" })}
              </span>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
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
    </div>
  );
}
