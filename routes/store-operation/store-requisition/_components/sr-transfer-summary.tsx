
import { useTranslations } from "use-intl";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { LocationTile, SummaryRow } from "./sr-form-shared";

interface LocationInfo {
  readonly name: string;
  readonly code: string;
}

interface OverIssuedLine {
  readonly line: number;
  readonly issued: number;
  readonly approved: number;
}

interface SrTransferSummaryProps {
  readonly fromLocInfo: LocationInfo;
  readonly toLocInfo: LocationInfo;
  readonly itemCount: number;
  readonly totalRequested: number;
  readonly totalApproved: number;
  readonly totalIssued: number;
  readonly firstOverIssued?: OverIssuedLine;
}

export function SrTransferSummary({
  fromLocInfo,
  toLocInfo,
  itemCount,
  totalRequested,
  totalApproved,
  totalIssued,
  firstOverIssued,
}: SrTransferSummaryProps) {
  const t = useTranslations("storeOperation.storeRequisition");

  return (
    <aside className="flex flex-col gap-5">
      <section className="bg-background rounded-lg border">
        <header className="border-b px-5 py-3.5 text-[0.8125rem] font-semibold">
          {t("transferSummary")}
        </header>
        <div className="p-5">
          <div className="mb-3.5 flex items-stretch gap-2.5">
            <LocationTile
              label={t("from")}
              name={fromLocInfo.name}
              code={fromLocInfo.code}
            />
            <div className="flex shrink-0 items-center">
              <ArrowRight aria-hidden className="text-primary h-4 w-4" />
            </div>
            <LocationTile
              label={t("to")}
              name={toLocInfo.name}
              code={toLocInfo.code}
              highlighted
            />
          </div>

          <SummaryRow label={t("summaryItems")} value={itemCount} />
          <SummaryRow
            label={t("summaryTotalRequested")}
            value={totalRequested}
          />
          <SummaryRow
            label={t("summaryTotalApproved")}
            value={totalApproved}
          />
          <SummaryRow
            label={t("summaryTotalIssued")}
            value={totalIssued}
            last
          />
        </div>
      </section>

      {firstOverIssued && (
        <div
          role="alert"
          className="border-warning/40 bg-warning/10 flex gap-3 rounded-lg border p-4"
        >
          <AlertTriangle
            aria-hidden
            className="text-warning mt-0.5 h-4 w-4 shrink-0"
          />
          <div className="space-y-1">
            <p className="text-warning-foreground text-[0.8125rem] font-semibold">
              {t("overIssuedTitle")}
            </p>
            <p className="text-warning-foreground/80 text-xs leading-relaxed">
              {t("overIssuedDesc", {
                lines: firstOverIssued.line,
                issued: firstOverIssued.issued,
                approved: firstOverIssued.approved,
              })}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
