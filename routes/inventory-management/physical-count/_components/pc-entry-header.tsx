
import { useRouter } from "@/lib/compat/navigation";
import {
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  Clock,
  MapPin,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
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
  const router = useRouter();

  return (
    <div className="border-border/60 bg-card mb-3 rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => router.push("/inventory-management/physical-count")}
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
          <Badge
            variant="info"
            size="xs"
            className="text-[0.5625rem] tracking-widest uppercase"
          >
            {status ?? t("tabInProgress")}
          </Badge>
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
  );
}
