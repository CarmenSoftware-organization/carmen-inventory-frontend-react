import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Landmark,
  ShieldCheck,
} from "lucide-react";
import { useLocale } from "use-intl";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CashForecastScenario,
  CashForecastSnapshot,
} from "@/types/accounting-dashboard";

const money = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function CashForecastPanel({
  forecast,
  scenario,
  onScenarioChange,
}: {
  readonly forecast: CashForecastSnapshot;
  readonly scenario: CashForecastScenario;
  readonly onScenarioChange: (scenario: CashForecastScenario) => void;
}) {
  const locale = useLocale();
  const isThai = locale.startsWith("th");
  const localize = (value: { en: string; th: string }) =>
    value[isThai ? "th" : "en"];
  const formatMoney = (value: number) =>
    `${forecast.currency} ${money.format(value)}`;
  const chartData = forecast.weeks.map((week) => ({
    ...week,
    outflow: -week.totalOutflow,
    inflow: week.totalInflow,
    balance: week.closingBalance,
  }));

  return (
    <Card className="border-primary/20 gap-0 overflow-hidden py-0">
      <CardHeader className="bg-primary/[0.045] flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Landmark className="text-primary size-4" aria-hidden="true" />
            <CardTitle className="text-sm">
              {isThai
                ? "ประมาณการกระแสเงินสด 13 สัปดาห์"
                : "13-week cash forecast"}
            </CardTitle>
            <Badge variant="outline" size="xs">
              {isThai ? "ข้อมูลประมาณการ" : "Forecast"}
            </Badge>
          </div>
          <CardDescription className="max-w-2xl text-xs">
            {isThai
              ? "รวมเงินรับ AR, เงินจ่าย AP, รายการเงินสด GL และ Capex/Disposal ข้อมูลนี้ไม่สร้างหรือแก้เอกสารบัญชี"
              : "Combines AR receipts, AP payments, GL cash items and Asset capex/disposals. This view never creates or changes accounting documents."}
          </CardDescription>
        </div>
        <label className="grid gap-1 text-xs">
          <span className="text-muted-foreground">
            {isThai ? "สถานการณ์" : "Scenario"}
          </span>
          <Select
            value={scenario}
            onValueChange={(value) =>
              onScenarioChange(value as CashForecastScenario)
            }
          >
            <SelectTrigger size="sm" className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">Base case</SelectItem>
              <SelectItem value="best">Best case</SelectItem>
              <SelectItem value="worst">Worst case</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </CardHeader>
      <CardContent className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
          <ForecastMetric
            icon={Landmark}
            label={isThai ? "เงินสดต้นงวด" : "Opening cash"}
            value={formatMoney(forecast.openingCash)}
            tone="primary"
          />
          <ForecastMetric
            icon={ArrowDownToLine}
            label={isThai ? "เงินรับรวม" : "Total inflow"}
            value={formatMoney(forecast.totalInflow)}
            tone="success"
          />
          <ForecastMetric
            icon={ArrowUpFromLine}
            label={isThai ? "เงินจ่ายรวม" : "Total outflow"}
            value={formatMoney(forecast.totalOutflow)}
            tone="warning"
          />
          <ForecastMetric
            icon={AlertTriangle}
            label={isThai ? "ยอดต่ำสุด" : "Lowest balance"}
            value={formatMoney(forecast.lowestBalance)}
            tone={forecast.lowestBalance < 0 ? "destructive" : "warning"}
          />
          <ForecastMetric
            icon={ShieldCheck}
            label={isThai ? "ความครบถ้วน" : "Completeness"}
            value={`${forecast.completeness}% · ${forecast.confidence}`}
            tone="info"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-4 text-xs">
              <ChartKey
                color="var(--success)"
                label={isThai ? "เงินรับ" : "Inflow"}
              />
              <ChartKey
                color="var(--warning)"
                label={isThai ? "เงินจ่าย" : "Outflow"}
              />
              <ChartKey
                color="var(--primary)"
                label={isThai ? "ยอดปลายสัปดาห์" : "Closing balance"}
                line
              />
            </div>
            <ChartContainer
              className="aspect-auto h-64 w-full"
              config={{
                inflow: {
                  label: isThai ? "เงินรับ" : "Inflow",
                  color: "var(--success)",
                },
                outflow: {
                  label: isThai ? "เงินจ่าย" : "Outflow",
                  color: "var(--warning)",
                },
                balance: {
                  label: isThai ? "ยอดปลายสัปดาห์" : "Closing balance",
                  color: "var(--primary)",
                },
              }}
            >
              <ComposedChart
                data={chartData}
                margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  tickFormatter={(value) => money.format(Number(value))}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <ReferenceLine y={0} stroke="var(--border)" />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatMoney(Number(value))}
                    />
                  }
                />
                <Bar
                  dataKey="inflow"
                  fill="var(--color-inflow)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={16}
                />
                <Bar
                  dataKey="outflow"
                  fill="var(--color-outflow)"
                  radius={[0, 0, 3, 3]}
                  maxBarSize={16}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--color-balance)"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: "var(--color-balance)" }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ChartContainer>
          </div>
          <aside
            className="bg-muted/50 rounded-lg p-3"
            aria-label={isThai ? "สมมติฐานประมาณการ" : "Forecast assumptions"}
          >
            <p className="text-xs font-semibold">
              {isThai ? "สมมติฐานที่ใช้" : "Applied assumptions"}
            </p>
            <ul className="mt-2 space-y-2 text-xs">
              {forecast.assumptions.map((assumption) => (
                <li key={assumption.en} className="flex gap-2">
                  <span className="text-primary" aria-hidden="true">
                    •
                  </span>
                  <span>{localize(assumption)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 grid gap-1 border-t pt-3 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {isThai ? "จุดต่ำสุด" : "Lowest week"}
                </dt>
                <dd className="font-medium">W{forecast.lowestBalanceWeek}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {isThai ? "รุ่นสมมติฐาน" : "Assumption version"}
                </dt>
                <dd className="font-medium">{forecast.assumptionsVersion}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function ForecastMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  readonly icon: typeof Landmark;
  readonly label: string;
  readonly value: string;
  readonly tone: "primary" | "success" | "warning" | "destructive" | "info";
}) {
  const toneClass = {
    primary: "text-primary",
    success: "text-success-ink",
    warning: "text-warning-ink",
    destructive: "text-destructive",
    info: "text-info-ink",
  }[tone];
  return (
    <div className="min-w-0">
      <div
        className={`flex items-center gap-1.5 text-xs font-medium ${toneClass}`}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p
        className="mt-1 truncate text-base font-semibold tabular-nums"
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function ChartKey({
  color,
  label,
  line = false,
}: {
  readonly color: string;
  readonly label: string;
  readonly line?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={line ? "h-0.5 w-4" : "size-2.5 rounded-sm"}
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
