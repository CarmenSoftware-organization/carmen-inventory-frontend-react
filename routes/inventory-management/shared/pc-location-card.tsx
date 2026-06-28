
import { useTranslations } from "use-intl";
import {
  ChevronRight,
  Warehouse,
  Package,
  Calendar,
  Eye,
  Play,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { getLocationTypeLabel } from "@/constant/location-type";
import {
  getPcActionLabel,
  PC_ACTION_BUTTON_VARIANTS,
  type PcActionType,
} from "@/constant/pc-action-type";
import type { PhysicalCountLocation } from "@/types/physical-count";
import {
  LocationAvatar,
  LocationCardShell,
  LocationHeading,
} from "./inv-shared";

interface PcLocationCardProps {
  readonly item: PhysicalCountLocation;
  readonly index?: number;
  readonly onAction: (item: PhysicalCountLocation) => void;
}

/**
 * การ์ดแสดง Physical Count Location หนึ่งรายการ (Soft Sheet style)
 * แสดง progress bar, location type และสถานะ complete / in_progress / not_started
 */
export function PcLocationCard({ item, index, onAction }: PcLocationCardProps) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const { dateFormat } = useProfile();

  const locationTypeLabel = getLocationTypeLabel(t, item.location_type);

  const isComplete = item.physical_count_status === "completed";
  const isInProgress = item.physical_count_status === "in_progress";

  const total = item.product_total ?? 0;
  const counted = item.product_counted ?? 0;
  const progress = total > 0 ? Math.round((counted / total) * 100) : 0;

  const dateLabel = item.completed_at
    ? t("started", { date: formatDate(item.completed_at, dateFormat) })
    : item.start_counting_at
      ? t("started", { date: formatDate(item.start_counting_at, dateFormat) })
      : null;

  let actionType: PcActionType = "start";
  if (isComplete) actionType = "done";
  else if (isInProgress) actionType = "resume";

  const ActionIcon = actionType === "done" ? Eye : Play;
  const actionLabel = getPcActionLabel(t, actionType);
  const actionVariant = PC_ACTION_BUTTON_VARIANTS[actionType];

  return (
    <LocationCardShell>
      {/* Row 1: Avatar + Name + Action */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <LocationAvatar
            letter={item.name?.[0]?.toUpperCase() ?? "?"}
            index={index}
          />
          <div className="min-w-0 flex-1 space-y-1">
            <LocationHeading
              href={`/config/location/${item.id}`}
              name={item.name}
              code={item.code}
              countBadge={{
                variant:
                  item.physical_count_type === "yes" ? "outline" : "secondary",
                label:
                  item.physical_count_type === "yes"
                    ? t("count")
                    : t("notCount"),
              }}
            />
            <div className="text-muted-foreground flex items-center gap-1.5 text-[0.6875rem]">
              <Warehouse className="size-2.5 shrink-0" aria-hidden="true" />
              <span>{locationTypeLabel}</span>
            </div>
          </div>
        </div>

        <div className="shrink-0">
          {actionType === "done" ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-[0.6875rem] font-semibold tracking-wider uppercase">
              <CheckCircle2
                className="text-success size-3"
                aria-hidden="true"
              />
              {actionLabel}
            </span>
          ) : (
            <Button
              size="sm"
              variant={actionVariant}
              onClick={() => onAction(item)}
              className="rounded-full"
            >
              <ActionIcon className="size-3.5" aria-hidden="true" />
              {actionLabel}
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[0.6875rem]">
          <span className="text-muted-foreground tracking-wide uppercase">
            {t("progress")}
          </span>
          <span className="text-foreground/80 font-semibold tabular-nums">
            {counted}/{total} ({progress}%)
          </span>
        </div>
        <Progress value={progress} variant="auto" className="h-1" />
      </div>

      {/* Row 3: Footer meta */}
      <div className="border-border/40 text-muted-foreground flex items-center gap-4 border-t pt-2 text-[0.6875rem]">
        <span className="flex items-center gap-1">
          <Package className="size-2.5" aria-hidden="true" />
          {t("nItems", { count: total })}
        </span>
        {dateLabel && (
          <span className="flex items-center gap-1">
            <Calendar className="size-2.5" aria-hidden="true" />
            {dateLabel}
          </span>
        )}
      </div>
    </LocationCardShell>
  );
}
