
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Send,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { Button } from "@/components/ui/button";
import { ReviewStatTile } from "./review-stat-tile";
import { VarianceGrid, type VarianceGridItem } from "./variance-grid";

interface ReviewComponentProps<T extends VarianceGridItem> {
  readonly translationNamespace: string;
  readonly locationCode?: string;
  readonly locationName?: string;
  readonly matches: number;
  readonly variances: number;
  readonly overages: number;
  readonly shortages: number;
  readonly varianceItems: readonly T[];
  readonly getSystemQty: (item: T) => number;
  readonly getActualQty: (item: T) => number | null;
  readonly getVariance: (item: T) => number;
  readonly getUnitName: (item: T) => string;
  readonly onBack: () => void;
  readonly onSubmit: () => void;
  readonly isSubmitting: boolean;
  readonly submitLabel: string;
  readonly submittingLabel: string;
}

export function ReviewComponent<T extends VarianceGridItem>({
  translationNamespace,
  locationCode,
  locationName,
  matches,
  variances,
  overages,
  shortages,
  varianceItems,
  getSystemQty,
  getActualQty,
  getVariance,
  getUnitName,
  onBack,
  onSubmit,
  isSubmitting,
  submitLabel,
  submittingLabel,
}: ReviewComponentProps<T>) {
  const t = useTranslations(translationNamespace);
  const tc = useTranslations("common");

  return (
    <div className="relative isolate -mx-3 -my-3">
      <div
        className="relative flex min-h-[calc(100vh-4rem-3rem)] flex-col px-4 pt-4 lg:px-4"
        style={{
          paddingBottom: "max(7rem, calc(env(safe-area-inset-bottom) + 6rem))",
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label={tc("goBack")}
            className="rounded-full"
          >
            <ArrowLeft />
          </Button>
          <div className="min-w-0">
            <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-bold tracking-widest uppercase">
              <ClipboardCheck className="size-2.5" />
              {t("entity")}
            </span>
            <h1 className="text-foreground mt-1 text-lg leading-tight font-semibold tracking-tight md:text-xl">
              {t("reviewTitle")}
            </h1>
            {(locationCode ?? locationName) && (
              <p className="text-muted-foreground mt-0.5 text-[0.625rem] tracking-wide uppercase">
                {locationCode}
                {locationCode && locationName && (
                  <>
                    {" "}
                    <span className="text-muted-foreground/60">·</span>{" "}
                  </>
                )}
                {locationName}
              </p>
            )}
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-2.5 sm:grid-cols-4">
          <ReviewStatTile
            icon={CheckCircle2}
            tone="success"
            label={t("reviewMatches")}
            value={matches}
            desc={t("reviewMatchesDesc")}
          />
          <ReviewStatTile
            icon={AlertTriangle}
            tone="warning"
            label={t("reviewVariances")}
            value={variances}
            desc={t("reviewVariancesDesc")}
          />
          <ReviewStatTile
            icon={TrendingUp}
            tone="success"
            label={t("reviewOverages")}
            value={overages}
            desc={t("reviewOveragesDesc")}
          />
          <ReviewStatTile
            icon={TrendingDown}
            tone="destructive"
            label={t("reviewShortages")}
            value={shortages}
            desc={t("reviewShortagesDesc")}
          />
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="text-warning size-4" aria-hidden="true" />
            <h2 className="text-foreground text-sm font-semibold tracking-tight">
              {t("varianceDetails")}
            </h2>
            <span className="bg-muted/60 text-muted-foreground rounded-full px-2 py-0.5 text-[0.625rem] font-semibold tabular-nums">
              {variances}
            </span>
          </div>

          {variances === 0 ? (
            <div className="border-success/30 bg-success/5 flex items-center justify-center gap-2 rounded-xl border border-dashed py-8">
              <CheckCircle2 className="text-success size-4" />
              <span className="text-foreground/80 text-xs">
                {t("noVariances")}
              </span>
            </div>
          ) : (
            <VarianceGrid<T>
              items={varianceItems}
              getSystemQty={getSystemQty}
              getActualQty={getActualQty}
              getVariance={getVariance}
              getUnitName={getUnitName}
              translationNamespace={translationNamespace}
            />
          )}
        </section>

        <div className="border-border/60 bg-card/80 fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              size="sm"
              onClick={onSubmit}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-[0_0.5rem_1rem_-0.25rem_color-mix(in_oklch,var(--primary),transparent_60%)]"
            >
              <Send className="size-3.5" aria-hidden="true" />
              {isSubmitting ? submittingLabel : submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
