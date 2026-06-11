
import { useTranslations } from "use-intl";
import {
  BarCard,
  KpiCard,
  PieCard,
  WidgetSkeleton,
  type ResolvedWidget,
} from "@/components/dashboard-widget/dashboard-widget-grid";
import { AppTile } from "@/components/icons/tiles";
import { useConfigWidgets } from "@/hooks/use-dashboard-widgets";
import type { CompositeWidgetItem } from "@/types/dashboard-widget";

const MODULE_NAME = "config";

const HIDDEN_DATASETS = new Set<string>([]);

const DATASET_TO_SUB_TILE: Record<string, string> = {
  "config.location-active-count": "storeLocation",
  "config.vendor-by-business-type": "businessType",
  "config.cn-by-reason": "creditNoteReason",
  "config.tax-profile-by-rate": "taxProfile",
  "config.exchange-rate-latest": "exchangeRate",
};

function subTileFor(datasetId: string): string {
  return DATASET_TO_SUB_TILE[datasetId] ?? "document";
}

function isResolved(w: CompositeWidgetItem): w is ResolvedWidget {
  return !!w.meta && !!w.data;
}

export default function ConfigDashboard() {
  const t = useTranslations("config.dashboard");
  const td = useTranslations("dashboardWidget");
  const { data, isLoading, isError, error } = useConfigWidgets();

  const resolved = (data?.items ?? [])
    .filter((w) => !HIDDEN_DATASETS.has(w.dataset_id))
    .filter(isResolved)
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  const kpis = resolved.filter(
    (w) => w.widget_type === "kpi" || w.widget_type === "gauge",
  );
  const pies = resolved.filter((w) => w.widget_type === "pie");
  const bars = resolved.filter((w) => w.widget_type === "bar");
  const hasAny = kpis.length + pies.length + bars.length > 0;

  return (
    <div className="space-y-4 p-3">
      <header className="flex items-center gap-3">
        <AppTile name={MODULE_NAME} size={40} />
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-semibold">{t("title")}</h1>
          <p className="text-muted-foreground text-sm leading-snug">
            {t("description")}
          </p>
        </div>
      </header>

      {isError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
        >
          {td("loadError", { message: error?.message ?? "Unknown error" })}
        </div>
      )}

      {isLoading && (
        <div
          aria-busy="true"
          aria-live="polite"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <WidgetSkeleton key={`cd-skeleton-${i}`} />
          ))}
        </div>
      )}

      {!isLoading && !isError && !hasAny && (
        <p className="text-muted-foreground bg-muted/30 rounded-lg border border-dashed p-6 text-center text-sm">
          {td("empty")}
        </p>
      )}

      {kpis.length > 0 && (
        <Section heading={td("sectionKpi")}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((w) => (
              <KpiCard
                key={w.dataset_id}
                widget={w}
                moduleName={MODULE_NAME}
                subTileFor={subTileFor}
              />
            ))}
          </div>
        </Section>
      )}

      {bars.length > 0 && (
        <Section heading={td("sectionComparison")}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {bars.map((w) => (
              <BarCard
                key={w.dataset_id}
                widget={w}
                moduleName={MODULE_NAME}
                subTileFor={subTileFor}
              />
            ))}
          </div>
        </Section>
      )}

      {pies.length > 0 && (
        <Section heading={td("sectionDistribution")}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {pies.map((w) => (
              <PieCard
                key={w.dataset_id}
                widget={w}
                moduleName={MODULE_NAME}
                subTileFor={subTileFor}
              />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  heading,
  children,
}: {
  readonly heading: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-muted-foreground text-[0.625rem] font-bold tracking-[0.16em] uppercase">
        {heading}
      </h2>
      {children}
    </section>
  );
}
