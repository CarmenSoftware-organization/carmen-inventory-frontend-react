
import { useTranslations } from "use-intl";
import {
  Boxes,
  Calendar,
  CalendarCheck,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { ScDocStatusRow } from "./sc-doc-status-row";
import type { SpotCheck } from "@/types/spot-check";

interface ScHistoryCardProps {
  readonly spotCheck: SpotCheck;
  readonly onClick: (sc: SpotCheck) => void;
}

/**
 * Card สำหรับ History view — แสดง spot check บันทึกหนึ่งรายการ
 * Click → navigate ไป /spot-check/[id]
 */
export function ScHistoryCard({ spotCheck, onClick }: ScHistoryCardProps) {
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  return (
    <button
      type="button"
      onClick={() => onClick(spotCheck)}
      className={cn(
        "border-border/60 bg-card hover:border-primary/40 group relative w-full overflow-hidden rounded-xl border p-3 text-left transition-colors",
      )}
    >
      <ScDocStatusRow
        docNo={spotCheck.spot_check_no}
        docStatus={spotCheck.doc_status}
        method={spotCheck.method}
      />

      {/* Location */}
      <div className="text-muted-foreground mt-1.5 flex items-center gap-1.5 text-[0.6875rem]">
        <MapPin className="size-2.5 shrink-0" aria-hidden="true" />
        <span className="text-foreground/85 font-semibold">
          {spotCheck.location_name}
        </span>
        <span className="text-muted-foreground/80 text-[0.625rem] uppercase">
          {spotCheck.location_code}
        </span>
      </div>

      {/* Footer meta */}
      <div className="border-border/40 text-muted-foreground mt-2 flex flex-wrap items-center gap-3 border-t pt-2 text-[0.6875rem]">
        <span className="inline-flex items-center gap-1">
          <Calendar className="size-2.5" aria-hidden="true" />
          <span className="font-semibold">{tfl("startDate")}</span>
          <span>{formatDate(spotCheck.start_date, dateFormat)}</span>
        </span>
        {spotCheck.end_date && (
          <span className="inline-flex items-center gap-1">
            <CalendarCheck className="size-2.5" aria-hidden="true" />
            <span className="font-semibold">{tfl("endDate")}</span>
            <span>{formatDate(spotCheck.end_date, dateFormat)}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <Boxes className="size-2.5" aria-hidden="true" />
          <span className="text-foreground font-semibold tabular-nums">
            {spotCheck.size}
          </span>
          <span>{tfl("items").toLowerCase()}</span>
        </span>
        <ChevronRight
          className="text-muted-foreground/60 group-hover:text-primary ml-auto size-3.5 transition-colors"
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
