
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "use-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UseQueryResult } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppTile, SubTile } from "@/components/icons/tiles";
import { cn } from "@/lib/utils";
import {
  isCategoricalData,
  isScalarDeltaData,
  isTimeSeriesData,
  type CategoricalPoint,
  type CompositeWidgetItem,
  type DashboardWidgetListResponse,
  type DatasetData,
  type DatasetMeta,
  type DatasetShape,
  type TimeSeriesPoint,
} from "@/types/dashboard-widget";

/** Widget that has its dataset payload resolved — `meta` and `data` are guaranteed. */
export type ResolvedWidget = CompositeWidgetItem & {
  readonly meta: DatasetMeta;
  readonly data: DatasetData<DatasetShape>;
};

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** จัดลำดับ render group ตาม widget_type ให้ layout ลงตัวบน grid 4-col */
const WIDGET_TYPE_ORDER: Record<string, number> = {
  kpi: 0,
  gauge: 0,
  sparkline: 1,
  pie: 2,
  bar: 3,
  line: 4,
  area: 4,
  table: 5,
  heatmap: 6,
};

function humanizeLabel(label: string): string {
  return label.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: number, unit: string): string {
  if (unit === "฿") {
    return new Intl.NumberFormat("th-TH", {
      maximumFractionDigits: 0,
    }).format(value);
  }
  return value.toLocaleString();
}

export interface DashboardWidgetGridProps {
  readonly title: string;
  readonly description: string;
  readonly moduleName: string;
  readonly subTileFor: (datasetId: string) => string;
  readonly query: UseQueryResult<DashboardWidgetListResponse>;
  /** dataset_id ที่ต้องการซ่อน (ไม่ render) */
  readonly hiddenDatasets?: ReadonlySet<string>;
}

export function DashboardWidgetGrid({
  title,
  description,
  moduleName,
  subTileFor,
  query,
  hiddenDatasets,
}: DashboardWidgetGridProps) {
  const t = useTranslations("dashboardWidget");
  const { data, isLoading, isError, error } = query;

  const widgets = (data?.items ?? [])
    .filter((w) => !hiddenDatasets?.has(w.dataset_id))
    .sort((a, b) => {
    const groupDiff =
      WIDGET_TYPE_ORDER[a.widget_type] - WIDGET_TYPE_ORDER[b.widget_type];
    if (groupDiff !== 0) return groupDiff;
    return a.order_index - b.order_index;
  });

  return (
    <div className="space-y-4 p-3">
      <header className="flex items-center gap-3">
        <AppTile name={moduleName} size={40} />
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-semibold">{title}</h1>
          <p className="text-muted-foreground text-sm leading-snug">
            {description}
          </p>
        </div>
      </header>

      {isError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border p-3 text-sm"
        >
          {t("loadError", { message: error?.message ?? "Unknown error" })}
        </div>
      )}

      <section
        aria-busy={isLoading}
        aria-live="polite"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {isLoading ? (
          <WidgetSkeletonCards />
        ) : (
          widgets.map((w) => (
            <WidgetRouter
              key={w.dataset_id}
              widget={w}
              moduleName={moduleName}
              subTileFor={subTileFor}
            />
          ))
        )}

        {!isLoading && !isError && widgets.length === 0 && (
          <p className="bg-muted/30 text-muted-foreground col-span-full rounded-lg border border-dashed p-6 text-center text-sm">
            {t("empty")}
          </p>
        )}
      </section>
    </div>
  );
}

interface WidgetCardProps {
  readonly widget: ResolvedWidget;
  readonly moduleName: string;
  readonly subTileFor: (datasetId: string) => string;
}

interface UnresolvedWidgetCardProps {
  readonly widget: CompositeWidgetItem;
  readonly moduleName: string;
  readonly subTileFor: (datasetId: string) => string;
}

function WidgetRouter({
  widget,
  moduleName,
  subTileFor,
}: UnresolvedWidgetCardProps) {
  if (!widget.meta || !widget.data) return null;
  const resolved = widget as ResolvedWidget;
  switch (widget.widget_type) {
    case "kpi":
      return (
        <div className="lg:col-span-1">
          <KpiCard
            widget={resolved}
            moduleName={moduleName}
            subTileFor={subTileFor}
          />
        </div>
      );
    case "pie":
      return (
        <div className="sm:col-span-2 lg:col-span-2">
          <PieCard
            widget={resolved}
            moduleName={moduleName}
            subTileFor={subTileFor}
          />
        </div>
      );
    case "bar":
      return (
        <div className="sm:col-span-2 lg:col-span-2">
          <BarCard
            widget={resolved}
            moduleName={moduleName}
            subTileFor={subTileFor}
          />
        </div>
      );
    case "line":
    case "area":
      return (
        <div className="sm:col-span-2 lg:col-span-2">
          <LineCard
            widget={resolved}
            moduleName={moduleName}
            subTileFor={subTileFor}
          />
        </div>
      );
    default:
      return null;
  }
}

function WidgetHeader({ widget, moduleName, subTileFor }: WidgetCardProps) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="shrink-0">
        <SubTile
          name={subTileFor(widget.dataset_id)}
          parentName={moduleName}
          size={32}
        />
      </span>
      <div className="min-w-0 space-y-0.5">
        <CardTitle className="text-sm leading-snug font-semibold">
          {widget.title}
        </CardTitle>
        {widget.meta.description && (
          <CardDescription className="text-[0.6875rem] leading-snug">
            {widget.meta.description}
          </CardDescription>
        )}
      </div>
    </div>
  );
}

export function KpiCard({ widget, moduleName, subTileFor }: WidgetCardProps) {
  if (!isScalarDeltaData(widget.data)) return null;
  const { value, prev } = widget.data;
  const hasDelta = widget.meta.shape === "scalar_delta" && prev !== undefined;

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <WidgetHeader
          widget={widget}
          moduleName={moduleName}
          subTileFor={subTileFor}
        />
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tabular-nums">
            {value.toLocaleString()}
          </span>
          {widget.meta.unit && widget.meta.unit !== "฿" && (
            <span className="text-muted-foreground text-xs">
              {widget.meta.unit}
            </span>
          )}
        </div>
        {hasDelta && <DeltaIndicator value={value} prev={prev} />}
      </CardContent>
    </Card>
  );
}

export function PieCard({ widget, moduleName, subTileFor }: WidgetCardProps) {
  const t = useTranslations("dashboardWidget");
  if (!isCategoricalData(widget.data)) return null;
  const data = widget.data as readonly CategoricalPoint[];
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const chartData = data.map((d) => ({
    name: humanizeLabel(d.label),
    value: d.value,
  }));

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <WidgetHeader
          widget={widget}
          moduleName={moduleName}
          subTileFor={subTileFor}
        />
      </CardHeader>
      <CardContent className="px-4">
        {chartData.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            {t("noData")}
          </p>
        ) : (
          <div className="flex items-center gap-3">
            <div className="h-40 w-40 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={64}
                    dataKey="value"
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {chartData.map((item, i) => (
                      <Cell
                        key={item.name}
                        style={{ fill: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [
                      `${formatValue(v, widget.meta.unit ?? "")} ${widget.meta.unit ?? ""}`,
                      "",
                    ]}
                    contentStyle={{ fontSize: "0.6875rem" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="min-w-0 flex-1 space-y-1.5">
              {chartData.map((item, i) => {
                const pct =
                  total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <li key={item.name} className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[0.6875rem] leading-tight">
                      {item.name}
                    </span>
                    <span className="text-[0.6875rem] font-semibold tabular-nums">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground w-9 text-right text-[0.6875rem] tabular-nums">
                      {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BarCard({ widget, moduleName, subTileFor }: WidgetCardProps) {
  const t = useTranslations("dashboardWidget");
  if (!isCategoricalData(widget.data)) return null;
  const data = widget.data as readonly CategoricalPoint[];
  const sorted = data
    .slice()
    .sort((a, b) => b.value - a.value)
    .map((d) => ({ name: d.label, value: d.value }));
  const isCurrency = widget.meta.unit === "฿";
  const chartHeight = Math.max(140, sorted.length * 26);

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <WidgetHeader
          widget={widget}
          moduleName={moduleName}
          subTileFor={subTileFor}
        />
      </CardHeader>
      <CardContent className="px-4">
        {sorted.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            {t("noData")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              layout="vertical"
              data={sorted}
              margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
              barCategoryGap="20%"
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={120}
                interval={0}
              />
              <Tooltip
                formatter={(v: number) => [
                  `${isCurrency ? "฿" : ""}${formatValue(v, widget.meta.unit ?? "")}${
                    !isCurrency ? ` ${widget.meta.unit ?? ""}` : ""
                  }`,
                  "",
                ]}
                contentStyle={{ fontSize: "0.6875rem" }}
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
              />
              <Bar
                dataKey="value"
                radius={[0, 3, 3, 0]}
                isAnimationActive={false}
              >
                {sorted.map((item, i) => (
                  <Cell
                    key={item.name}
                    style={{ fill: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) =>
                    isCurrency ? `฿${formatValue(v, "฿")}` : formatValue(v, "")
                  }
                  style={{ fontSize: 10, fill: "var(--foreground)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function LineCard({ widget, moduleName, subTileFor }: WidgetCardProps) {
  const t = useTranslations("dashboardWidget");
  if (!isTimeSeriesData(widget.data)) return null;
  const data = widget.data as readonly TimeSeriesPoint[];
  const points = data.map((p) => ({ date: p.date, value: p.value }));
  const isCurrency = widget.meta.unit === "฿";

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <WidgetHeader
          widget={widget}
          moduleName={moduleName}
          subTileFor={subTileFor}
        />
      </CardHeader>
      <CardContent className="px-4">
        {points.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-xs">
            {t("noData")}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={points}
              margin={{ top: 8, right: 16, bottom: 0, left: -16 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                formatter={(v: number) => [
                  `${isCurrency ? "฿" : ""}${formatValue(v, widget.meta.unit ?? "")}${
                    !isCurrency ? ` ${widget.meta.unit ?? ""}` : ""
                  }`,
                  "",
                ]}
                contentStyle={{ fontSize: "0.6875rem" }}
                cursor={{ stroke: "var(--muted)", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ r: 2, fill: "var(--chart-1)" }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

type WidgetSkeletonVariant = "kpi" | "bar" | "pie";

export function WidgetSkeleton({
  variant = "kpi",
  className,
}: {
  readonly variant?: WidgetSkeletonVariant;
  readonly className?: string;
}) {
  return (
    <Card className={cn("gap-2 py-4", className)}>
      <CardHeader className="px-4">
        <div className="flex items-start gap-2.5">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        {variant === "kpi" && (
          <div className="space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        )}
        {variant === "bar" && (
          <div className="flex h-24 items-end gap-2">
            <Skeleton className="h-1/2 w-full" />
            <Skeleton className="h-4/5 w-full" />
            <Skeleton className="h-3/5 w-full" />
            <Skeleton className="h-full w-full" />
            <Skeleton className="h-2/5 w-full" />
          </div>
        )}
        {variant === "pie" && (
          <div className="flex items-center gap-4">
            <Skeleton className="size-20 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ชุด skeleton แบบ static หลายทรง + คละขนาด (bento) ให้ใกล้เคียง dashboard จริง
 * — kpi กว้าง 1 คอลัมน์, chart (bar/pie) กว้าง 2 คอลัมน์ ตรงกับ `WidgetRouter`
 */
export function WidgetSkeletonCards() {
  return (
    <>
      <WidgetSkeleton variant="kpi" />
      <WidgetSkeleton variant="kpi" />
      <WidgetSkeleton variant="pie" className="sm:col-span-2" />
      <WidgetSkeleton variant="bar" className="sm:col-span-2" />
      <WidgetSkeleton variant="kpi" />
      <WidgetSkeleton variant="kpi" />
    </>
  );
}

function DeltaIndicator({
  value,
  prev,
}: {
  readonly value: number;
  readonly prev: number;
}) {
  const t = useTranslations("dashboardWidget");
  const diff = value - prev;
  const pct = prev === 0 ? null : Math.round((diff / Math.abs(prev)) * 100);

  if (diff === 0) {
    return (
      <p className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
        <Minus className="size-3" aria-hidden="true" />
        <span>{t("deltaUnchanged")}</span>
      </p>
    );
  }

  const isUp = diff > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  const tone = isUp ? "text-emerald-600" : "text-rose-600";
  const sign = isUp ? "+" : "";

  return (
    <p className={cn("mt-1 flex items-center gap-1 text-xs", tone)}>
      <Icon className="size-3" aria-hidden="true" />
      <span className="tabular-nums">
        {sign}
        {diff.toLocaleString()}
        {pct !== null && ` (${sign}${pct}%)`}
      </span>
      <span className="text-muted-foreground">{t("deltaCompare")}</span>
    </p>
  );
}
