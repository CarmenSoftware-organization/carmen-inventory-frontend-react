
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FolderOpen,
  ClipboardCheck,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  kpiData,
  spendByMaterialGroup,
  spendByDepartment,
  prPipeline,
  topVendors,
  type PipelineStatus,
} from "../mock/main";

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงินบาทไทย
 * @param value - ตัวเลขที่ต้องการจัดรูปแบบ
 * @returns สตริงสกุลเงินบาท
 */
function formatCurrency(value: number) {
  return "฿" + value.toLocaleString("th-TH");
}

// ── Donut colors — resolved from globals.css chart vars ──────────────────────

const DONUT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-3)",
];

// ── Bar colors (one per department) ──────────────────────────────────────────

const BAR_COLORS = [
  "var(--chart-2)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--warning)",
  "var(--chart-3)",
];

// ── Pipeline status icon / color map ─────────────────────────────────────────

const PIPELINE_CONFIG: Record<
  PipelineStatus,
  { icon: React.ReactNode; barColor: string; countColor: string }
> = {
  saved: {
    icon: (
      <FolderOpen
        className="text-muted-foreground size-3.5"
        aria-hidden="true"
      />
    ),
    barColor: "var(--chart-1)",
    countColor: "bg-primary",
  },
  committed: {
    icon: (
      <ClipboardCheck
        className="text-muted-foreground size-3.5"
        aria-hidden="true"
      />
    ),
    barColor: "var(--chart-1)",
    countColor: "bg-primary",
  },
  awaiting_hod: {
    icon: (
      <FileText className="text-muted-foreground size-3.5" aria-hidden="true" />
    ),
    barColor: "var(--chart-1)",
    countColor: "bg-primary",
  },
  awaiting_purchase: {
    icon: (
      <UserCheck
        className="text-muted-foreground size-3.5"
        aria-hidden="true"
      />
    ),
    barColor: "var(--chart-1)",
    countColor: "bg-primary",
  },
  approved: {
    icon: <CheckCircle2 className="text-success size-3.5" aria-hidden="true" />,
    barColor: "var(--success)",
    countColor: "bg-success",
  },
  rejected: {
    icon: <XCircle className="text-destructive size-3.5" aria-hidden="true" />,
    barColor: "var(--destructive)",
    countColor: "bg-destructive",
  },
};

// ── KPI Cards ─────────────────────────────────────────────────────────────────

/**
 * การ์ด KPI หลักของ dashboard แสดง total spend, pending PRs, open POs และ budget utilization
 * @returns JSX ของ KPI cards
 */
function KpiCards() {
  const {
    totalSpendThisMonth,
    pendingPrCount,
    openPoCount,
    budgetUtilization,
  } = kpiData;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {/* Total Spend */}
      <Card className="gap-2 py-4">
        <CardContent className="px-4">
          <p className="text-muted-foreground text-xs">
            {totalSpendThisMonth.label}
          </p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">
            {formatCurrency(totalSpendThisMonth.value)}
          </p>
          <div className="mt-1.5 flex items-center gap-1">
            {totalSpendThisMonth.changeDirection === "up" ? (
              <TrendingUp
                className="text-success size-3.5"
                aria-hidden="true"
              />
            ) : (
              <TrendingDown
                className="text-destructive size-3.5"
                aria-hidden="true"
              />
            )}
            <span
              className={
                totalSpendThisMonth.changeDirection === "up"
                  ? "text-success text-xs"
                  : "text-destructive text-xs"
              }
            >
              {totalSpendThisMonth.changeDirection === "up" ? "+" : "-"}
              {totalSpendThisMonth.changePercent}% vs Last Month
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Pending PRs */}
      <Card className="gap-2 py-4">
        <CardContent className="px-4">
          <p className="text-muted-foreground text-xs">
            {pendingPrCount.label}
          </p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">
            {pendingPrCount.value}
          </p>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {pendingPrCount.description}
          </p>
        </CardContent>
      </Card>

      {/* Open POs */}
      <Card className="gap-2 py-4">
        <CardContent className="px-4">
          <p className="text-muted-foreground text-xs">{openPoCount.label}</p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight sm:text-2xl">
            {openPoCount.value}
          </p>
          <p className="text-muted-foreground mt-1.5 text-xs">
            {openPoCount.description}
          </p>
        </CardContent>
      </Card>

      {/* Budget Utilization */}
      <Card className="gap-2 py-4">
        <CardContent className="px-4">
          <p className="text-muted-foreground text-xs">
            {budgetUtilization.label}
          </p>
          <p className="mt-1 text-right text-xs font-semibold">
            {budgetUtilization.percent}%
          </p>
          <Progress
            value={budgetUtilization.percent}
            className="mt-1 h-2"
            indicatorClassName="bg-primary"
            aria-label="Budget utilization"
          />
          <p className="text-muted-foreground mt-1.5 text-xs">
            {budgetUtilization.description}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Donut Chart ───────────────────────────────────────────────────────────────

/**
 * Render label เปอร์เซ็นต์ภายใน donut chart
 * @param props - พารามิเตอร์จาก recharts
 * @returns JSX ของ text label หรือ null ถ้าค่าน้อยกว่าเกณฑ์
 */
const renderDonutLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.03) return null;
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[0.6875rem] font-semibold"
      fontSize={11}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
};

/**
 * Donut chart แสดงยอดซื้อแยกตามหมวดหมู่สินค้า
 * @returns JSX ของ donut chart
 */
function SpendByMaterialGroupChart() {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm font-semibold">
          ยอดซื้อแยกตามหมวดหมู่{" "}
          <span className="text-muted-foreground font-normal">
            (Spend by Material Group)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div
            className="h-44 w-44 shrink-0 sm:h-48 sm:w-48"
            style={{ touchAction: "pan-y" }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendByMaterialGroup}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={88}
                  dataKey="value"
                  labelLine={false}
                  label={renderDonutLabel}
                >
                  {spendByMaterialGroup.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      style={{
                        fill: DONUT_COLORS[index % DONUT_COLORS.length],
                      }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}%`, ""]}
                  contentStyle={{ fontSize: "0.75rem" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {spendByMaterialGroup.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{
                    backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length],
                  }}
                />
                <span className="text-xs">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Horizontal Bar Chart ──────────────────────────────────────────────────────

/**
 * Custom bar shape สำหรับ recharts เพื่อให้มีช่องว่างระหว่างแถบและมุมมน
 * @param props - พารามิเตอร์จาก recharts
 * @returns JSX ของ rect
 */
const CustomBarShape = (props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
}) => {
  const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props;
  return (
    <rect
      x={x}
      y={y + 2}
      width={width}
      height={Math.max(height - 4, 0)}
      style={{ fill: BAR_COLORS[index % BAR_COLORS.length] }}
      rx={3}
    />
  );
};

/**
 * Horizontal bar chart แสดงยอดซื้อแยกตาม business unit/department
 * @returns JSX ของ department chart
 */
function SpendByDepartmentChart() {
  const maxAmount = Math.max(...spendByDepartment.map((d) => d.amount));

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm font-semibold">
          ยอดซื้อแยกตามแผนก{" "}
          <span className="text-muted-foreground font-normal">
            (Spend by Business Unit / Department)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div style={{ touchAction: "pan-y" }}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              layout="vertical"
              data={spendByDepartment}
              margin={{ top: 0, right: 80, bottom: 0, left: 0 }}
              barCategoryGap="20%"
            >
              <XAxis
                type="number"
                domain={[0, maxAmount * 1.05]}
                tickFormatter={(v: number) =>
                  v === 0 ? "0" : `${(v / 1000).toFixed(0)},000`
                }
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="department"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={90}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrency(value),
                  "ยอดซื้อ",
                ]}
                contentStyle={{ fontSize: "0.75rem" }}
              />
              <Bar
                dataKey="amount"
                shape={<CustomBarShape />}
                isAnimationActive={false}
              >
                {spendByDepartment.map((_, index) => (
                  <Cell
                    key={`cell-dept-${index}`}
                    style={{ fill: BAR_COLORS[index % BAR_COLORS.length] }}
                  />
                ))}
                <LabelList
                  dataKey="amount"
                  position="right"
                  formatter={(v: number) => formatCurrency(v)}
                  style={{ fontSize: 10, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ── PR Pipeline ───────────────────────────────────────────────────────────────

const MAX_PIPELINE_COUNT = 40;

/**
 * Card แสดง PR pipeline พร้อม bottleneck analysis
 * @returns JSX ของ PR pipeline card
 */
function PrPipelineCard() {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm font-semibold">
          PR Pipeline: Bottle Neck Analysis{" "}
          <span className="text-muted-foreground font-normal">
            (PR/PO Status Pipeline)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="space-y-2">
          {prPipeline.map((item) => {
            const cfg = PIPELINE_CONFIG[item.status];
            const barWidth = Math.round(
              (item.count / MAX_PIPELINE_COUNT) * 100,
            );
            const isBottleneck = item.isBottleneck;

            return (
              <div key={item.status} className="flex items-center gap-2">
                {/* Icon + label */}
                <div className="flex w-24 shrink-0 items-center gap-1.5 sm:w-36">
                  {cfg.icon}
                  <span className="text-xs">{item.label}</span>
                </div>

                {/* Bar + count badge */}
                <div className="flex flex-1 items-center gap-2">
                  <div className="relative h-6 flex-1 overflow-visible">
                    <div
                      className="flex h-full items-center rounded-sm"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: isBottleneck
                          ? "var(--warning)"
                          : cfg.barColor,
                        minWidth: "2rem",
                      }}
                    >
                      <span className="px-1.5 text-[0.6875rem] font-semibold text-white">
                        {item.count}
                      </span>
                    </div>
                  </div>

                  {/* Amount */}
                  <span className="text-muted-foreground hidden w-20 shrink-0 text-right text-xs sm:inline">
                    {formatCurrency(item.amount)}
                  </span>

                  {/* Bottleneck badge */}
                  {isBottleneck && (
                    <Badge
                      variant="warning-light"
                      size="xs"
                      className="shrink-0 gap-0.5"
                    >
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      Bottleneck
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Top Vendors Table ─────────────────────────────────────────────────────────

/**
 * Card แสดงตาราง 5 vendors ที่มียอดซื้อสูงสุด
 * @returns JSX ของ top vendors card
 */
function TopVendorsCard() {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-sm font-semibold">
          ผู้จำหน่าย 5 อันดับแรกที่มีมูลค่าการซื้อสูงสุด{" "}
          <span className="text-muted-foreground font-normal">
            (Top 5 Vendors by Spend)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="-mx-4 overflow-x-auto px-4">
          <table
            className="w-full min-w-lg text-xs"
            aria-label="Top vendors by spend"
          >
            <thead>
              <tr className="bg-muted/60 text-foreground border-b">
                <th scope="col" className="py-2 pr-3 text-left font-medium">
                  ชื่อผู้จำหน่าย
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  ยอดซื้อ
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">
                  จำนวน PO
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Avg Delivery Time (Days)
                </th>
              </tr>
            </thead>
            <tbody>
              {topVendors.map((vendor) => (
                <tr key={vendor.name} className="border-b last:border-0">
                  <td className="py-2 pr-3">{vendor.name}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {formatCurrency(vendor.totalSpend)}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {typeof vendor.poCount === "string" ? (
                      <Badge variant="success" size="xs">
                        {vendor.poCount}
                      </Badge>
                    ) : (
                      vendor.poCount
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {vendor.avgDeliveryDays}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Component หลักของ main dashboard รวม KPI cards, charts และ top vendors
 *
 * @param - ไม่มี parameter
 * @returns JSX ของ main dashboard
 * @example
 * ```tsx
 * import DashboardMain from "./_components/dashboard-main";
 *
 * export default function Page() {
 *   return <DashboardMain />;
 * }
 * ```
 */
export default function DashboardMain() {
  return (
    <div className="min-w-0 space-y-3 p-3" style={{ touchAction: "pan-y" }}>
      <KpiCards />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SpendByMaterialGroupChart />
        <SpendByDepartmentChart />
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <PrPipelineCard />
        <TopVendorsCard />
      </div>
    </div>
  );
}
