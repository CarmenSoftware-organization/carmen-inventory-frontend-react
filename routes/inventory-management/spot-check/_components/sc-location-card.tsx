
import { useState } from "react";
import Link from "@/lib/compat/link";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  Play,
  RotateCcw,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useErrorToast } from "@/hooks/use-error-toast";
import { useProfile } from "@/hooks/use-profile";
import { useResetSpotCheck } from "@/hooks/use-spot-check";
import { getLocationTypeLabel } from "@/constant/location-type";
import { LocationAvatar, LocationCardShell } from "../../_shared/inv-shared";
import { ResumeInfoPanel } from "./sc-resume-info-panel";
import { ScResetDialog } from "./sc-reset-dialog";
import type {
  SpotCheckLocation,
  SpotCheckLocationLatest,
} from "@/types/spot-check";

interface ScLocationCardProps {
  readonly item: SpotCheckLocation;
  readonly index?: number;
  /** ถูกเรียกเมื่อกด Start (ไม่มี latest_spot_check) → ไป /location/[id] */
  readonly onStart: (item: SpotCheckLocation) => void;
  /** ถูกเรียกเมื่อกด Resume (มี latest_spot_check) → ไป /spot-check/[id] */
  readonly onResume: (
    item: SpotCheckLocation,
    latest: SpotCheckLocationLatest,
  ) => void;
}

/**
 * การ์ดแสดง location ใน Spot Check list
 * - latest_spot_check === null → mode "Start" (ปุ่ม outline + ไม่มี info panel)
 * - latest_spot_check !== null → mode "Resume" (premium info panel + Reset + Resume)
 */
export function ScLocationCard({
  item,
  index,
  onStart,
  onResume,
}: ScLocationCardProps) {
  const t = useTranslations("inventoryManagement.spotCheck");
  const { dateFormat } = useProfile();
  const errorToast = useErrorToast();

  const latest = item.latest_spot_check;
  const isResume = latest !== null;

  const resetSc = useResetSpotCheck();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleReset = () => {
    if (!latest) return;
    resetSc.mutate(latest.id, {
      onSuccess: () => {
        toast.success(t("resetSuccess"));
        setShowResetConfirm(false);
      },
      onError: errorToast,
    });
  };

  const locationTypeLabel = getLocationTypeLabel(t, item.location_type);

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
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/config/location/${item.location_id}`}
                className="text-foreground text-sm leading-tight font-semibold tracking-tight hover:underline"
              >
                {item.name || "..."}
              </Link>
              <Link
                href={`/config/location/${item.location_id}`}
                className="text-muted-foreground hover:text-foreground shrink-0 text-[0.625rem] tracking-wide uppercase transition-colors"
              >
                {item.code}
              </Link>
              {item.physical_count_type === "yes" ? (
                <span
                  title={t("countable")}
                  aria-label={t("countable")}
                  className="bg-success/15 text-success-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-full"
                >
                  <CheckCircle2 className="size-2.5" aria-hidden="true" />
                </span>
              ) : (
                <span
                  title={t("notCountable")}
                  aria-label={t("notCountable")}
                  className="bg-muted text-muted-foreground/70 inline-flex size-4 shrink-0 items-center justify-center rounded-full"
                >
                  <CircleSlash className="size-2.5" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="text-muted-foreground flex items-center gap-1.5 text-[0.6875rem]">
              <Warehouse className="size-2.5 shrink-0" aria-hidden="true" />
              <span>{locationTypeLabel}</span>
            </div>
          </div>
        </div>

        {isResume ? (
          <div className="flex shrink-0 items-center gap-1">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    onClick={() => setShowResetConfirm(true)}
                    disabled={resetSc.isPending}
                    aria-label={t("reset")}
                    className="text-muted-foreground hover:text-destructive rounded-full"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t("reset")}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              size="sm"
              variant="default"
              onClick={() => onResume(item, latest)}
              className="rounded-full"
            >
              <Play className="size-3.5" aria-hidden="true" />
              {t("resume")}
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStart(item)}
              className="rounded-full"
            >
              <Play className="size-3.5" aria-hidden="true" />
              {t("start")}
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {/* Premium info panel — เฉพาะ Resume mode */}
      {isResume && <ResumeInfoPanel latest={latest} dateFormat={dateFormat} />}

      {/* Reset confirmation — เฉพาะ Resume mode */}
      {isResume && (
        <ScResetDialog
          open={showResetConfirm}
          onOpenChange={setShowResetConfirm}
          isPending={resetSc.isPending}
          onConfirm={handleReset}
        />
      )}
    </LocationCardShell>
  );
}
