
import { Boxes, Calendar } from "lucide-react";
import { useTranslations } from "use-intl";
import { formatDate } from "@/lib/date-utils";
import type { SpotCheckLocationLatest } from "@/types/spot-check";
import { ScDocStatusRow } from "./sc-doc-status-row";

interface ResumeInfoPanelProps {
  readonly latest: SpotCheckLocationLatest;
  readonly dateFormat: string;
}

export function ResumeInfoPanel({ latest, dateFormat }: ResumeInfoPanelProps) {
  const tfl = useTranslations("field");

  return (
    <div className="bg-card mt-3 overflow-hidden rounded-md border">
      <div className="bg-muted/30 border-b px-3 py-2">
        <ScDocStatusRow
          docNo={latest.spot_check_no}
          docStatus={latest.doc_status}
          method={latest.method}
          size="sm"
        />
      </div>

      <div className="text-muted-foreground flex items-center justify-between gap-3 px-3 py-2 text-[0.6875rem]">
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-3 shrink-0" aria-hidden="true" />
          <span className="font-semibold">{tfl("startDate")}</span>
          <span>{formatDate(latest.start_date, dateFormat)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Boxes className="size-3 shrink-0" aria-hidden="true" />
          <span className="text-foreground tabular-nums font-semibold">
            {latest.counted} / {latest.size}
          </span>
          <span>{tfl("items").toLowerCase()}</span>
        </span>
      </div>
    </div>
  );
}
