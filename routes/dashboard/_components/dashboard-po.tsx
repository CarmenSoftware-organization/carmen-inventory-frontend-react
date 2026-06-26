
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
  FileText,
  Send,
  CircleDollarSign,
  CheckCircle2,
  ShoppingCart,
  PackageX,
  XCircle,
  CornerUpLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  poPipelineSummary,
  pendingPrsForPo,
  overdueDeliveries,
  overReceivedPos,
  poKpi,
  categorySpend,
  topVendorsBySpend,
  deliverySchedule,
  type PoPipelineKey,
  type PendingPoStatus,
} from "../mock/po";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงิน USD
 * @param value - ตัวเลขที่ต้องการจัดรูปแบบ
 * @returns สตริงสกุลเงิน
 */
function formatCurrency(value: number) {
  return "$" + value.toLocaleString("en-US");
}

// ── Pipeline config ───────────────────────────────────────────────────────────

const PIPELINE_CONFIG: Record<
  PoPipelineKey,
  { icon: React.ReactNode; iconBg: string; barColor: string }
> = {
  not_sent: {
    icon: <FileText className="size-5" aria-hidden="true" />,
    iconBg: "var(--warning)",
    barColor: "var(--warning)",
  },
  sent: {
    icon: <Send className="size-5" aria-hidden="true" />,
    iconBg: "var(--primary)",
    barColor: "var(--primary)",
  },
  partial: {
    icon: <CircleDollarSign className="size-5" aria-hidden="true" />,
    iconBg: "var(--chart-2)",
    barColor: "var(--chart-2)",
  },
  closed: {
    icon: <CheckCircle2 className="size-5" aria-hidden="true" />,
    iconBg: "var(--muted-foreground)",
    barColor: "var(--muted-foreground)",
  },
  completed: {
    icon: <ShoppingCart className="size-5" aria-hidden="true" />,
    iconBg: "var(--success)",
    barColor: "var(--success)",
  },
  rejected: {
    icon: <PackageX className="size-5" aria-hidden="true" />,
    iconBg: "var(--destructive)",
    barColor: "var(--destructive)",
  },
};

// ── Pending PR status config ──────────────────────────────────────────────────

const PENDING_STATUS_CONFIG: Record<
  PendingPoStatus,
  { label: string; variant: "warning-light" | "warning" | "destructive-light" }
> = {
  pending_po: { label: "Pending PO", variant: "warning-light" },
  hold_for_info: { label: "Hold for Info", variant: "warning" },
  overdue_followup: {
    label: "Overdue Follow-up",
    variant: "destructive-light",
  },
};

// ── Chart colors ──────────────────────────────────────────────────────────────

const CATEGORY_COLORS = ["var(--chart-1)", "var(--chart-4)", "var(--chart-2)"];

// ── Pipeline ──────────────────────────────────────────────────────────────────

/**
 * Section แสดง pipeline สถานะของ Purchase Order
 * @returns JSX ของ PO pipeline
 */
function PoPipeline() {
  const maxCount = Math.max(...poPipelineSummary.map((p) => p.count));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {poPipelineSummary.map((item) => {
        const cfg = PIPELINE_CONFIG[item.key];
        const barWidth = Math.round((item.count / maxCount) * 100);

        return (
          <div
            key={item.key}
            className="bg-card flex flex-col gap-2 rounded-lg border px-3 py-3"
          >
            <div className="flex items-center gap-2">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: cfg.iconBg }}
              >
                {cfg.icon}
              </div>
              <span className="text-muted-foreground text-[0.6875rem] font-semibold tracking-wide uppercase">
                {item.label}
              </span>
            </div>
            <p className="text-2xl leading-none font-bold">{item.count}</p>
            <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{ width: `${barWidth}%`, backgroundColor: cfg.barColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Pending PRs for PO Creation table ────────────────────────────────────────

/**
 * ตารางแสดง PRs ที่รอการสร้าง PO
 * @returns JSX ของตาราง pending PRs
 */
function PendingPrsTable() {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide uppercase">
        Pending PRs for PO Creation
      </p>
      <div className="overflow-x-auto">
      <table
        className="w-full min-w-[34rem] text-xs"
        aria-label="Pending PRs for PO creation"
      >
        <thead>
          <tr className="bg-muted/60 border-b">
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
              PR ID
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
              Requester
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
              Dept
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
              Date Approved ↓
            </th>
            <th scope="col" className="py-1.5 text-left font-semibold">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {pendingPrsForPo.map((pr) => {
            const statusCfg = PENDING_STATUS_CONFIG[pr.status];
            return (
              <tr
                key={`${pr.prId}-${pr.requester}`}
                className="hover:bg-muted/40 border-b last:border-0"
              >
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1">
                    {pr.isRejected ? (
                      <XCircle
                        className="text-destructive size-3 shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <CornerUpLeft
                        className="text-muted-foreground size-3 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span className="font-semibold">{pr.prId}</span>
                  </div>
                </td>
                <td className="py-1.5 pr-2">{pr.requester}</td>
                <td className="text-muted-foreground py-1.5 pr-2">{pr.dept}</td>
                <td className="text-muted-foreground py-1.5 pr-2">
                  {pr.dateApproved}
                </td>
                <td className="py-1.5">
                  <Badge variant={statusCfg.variant} size="xs">
                    {statusCfg.label}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Overdue Deliveries table ──────────────────────────────────────────────────

/**
 * ตารางแสดงรายการการส่งของที่ค้างเกินกำหนด
 * @returns JSX ของตาราง overdue deliveries
 */
function OverdueDeliveriesTable() {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide uppercase">
        Overdue Deliveries List
      </p>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-xs" aria-label="Overdue deliveries">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
              PO ID
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
              Vendor
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
              Dept
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
              Due Date ↓
            </th>
            <th scope="col" className="py-1.5 text-left font-semibold">
              Days Overdue
            </th>
          </tr>
        </thead>
        <tbody>
          {overdueDeliveries.map((d) => (
            <tr
              key={`${d.poId}-${d.vendor}`}
              className="hover:bg-muted/40 border-b last:border-0"
            >
              <td className="py-1.5 pr-2">
                <div className="flex items-center gap-1">
                  <XCircle
                    className="text-destructive size-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-semibold">{d.poId}</span>
                </div>
              </td>
              <td className="py-1.5 pr-2">{d.vendor}</td>
              <td className="text-muted-foreground py-1.5 pr-2">{d.dept}</td>
              <td className="text-muted-foreground py-1.5 pr-2">{d.dueDate}</td>
              <td className="text-destructive py-1.5 font-semibold">
                {d.daysOverdue} days overdue
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Gauge chart (semi-circle) ─────────────────────────────────────────────────

/**
 * Gauge chart แบบครึ่งวงกลมสำหรับแสดง KPI percentage
 * @param props - ค่า, label และสี
 * @returns JSX ของ gauge chart
 */
function GaugeChart({
  value,
  label,
  color,
}: {
  readonly value: number;
  readonly label: string;
  readonly color: string;
}) {
  const data = [{ value }, { value: 100 - value }];

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg bg-muted/30 px-3 py-3">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="relative aspect-[2/1] w-full max-w-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius="72%"
              outerRadius="100%"
              dataKey="value"
              strokeWidth={0}
            >
              <Cell style={{ fill: color }} />
              <Cell style={{ fill: "var(--muted)" }} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute right-0 bottom-0 left-0 flex justify-center pb-0.5">
          <span className="text-xl font-bold">{value}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Category Spend card ───────────────────────────────────────────────────────

/**
 * Card แสดงยอดซื้อแยกตามหมวดหมู่ เปรียบเทียบเดือนปัจจุบันกับ YTD
 * @returns JSX ของ category spend card
 */
function CategorySpendCard() {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="px-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Category Spend (Cur Mo vs YTD)
        </p>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          {/* Donut */}
          <div className="h-36 w-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorySpend}
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={62}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {categorySpend.map((item, i) => (
                    <Cell
                      key={item.name}
                      style={{ fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [`${v}%`, ""]}
                  contentStyle={{ fontSize: "0.6875rem" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend + values — 3 columns: dot | name | numbers */}
          <div className="w-full flex-1 divide-y">
            {categorySpend.map((item, i) => (
              <div key={item.name} className="flex items-start gap-2 py-1.5 first:pt-0 last:pb-0">
                <span
                  className="mt-1 size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold leading-tight">{item.name}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[0.6875rem] font-semibold tabular-nums">
                    {formatCurrency(item.currentMonth)}
                  </p>
                  <p className="text-[0.6rem] text-muted-foreground tabular-nums">
                    YTD: {formatCurrency(item.ytd)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Top 5 Vendors bar chart ───────────────────────────────────────────────────

/**
 * Horizontal bar chart แสดง 5 vendors ที่มียอดซื้อสูงสุด
 * @returns JSX ของ top vendors chart
 */
function TopVendorsChart() {
  const maxAmount = Math.max(...topVendorsBySpend.map((v) => v.amount));

  return (
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-semibold tracking-wide uppercase">
        Top 5 Vendors by Spend
      </p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart
          layout="vertical"
          data={topVendorsBySpend}
          margin={{ top: 0, right: 55, bottom: 0, left: 0 }}
          barCategoryGap="18%"
        >
          <XAxis type="number" domain={[0, maxAmount * 1.1]} hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            formatter={(v: number) => [formatCurrency(v), "Spend"]}
            contentStyle={{ fontSize: "0.6875rem" }}
          />
          <Bar
            dataKey="amount"
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
            style={{ fill: "var(--chart-1)" }}
          >
            <LabelList
              dataKey="amount"
              position="right"
              formatter={(v: number) => formatCurrency(v)}
              style={{ fontSize: 9, fill: "hsl(var(--foreground))" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-muted-foreground text-[0.6rem]">
        $ $5,000 $10,000 $5,000 $20,000
      </p>
    </div>
  );
}

// ── Delivery Schedule cards ───────────────────────────────────────────────────

/**
 * การ์ดแสดงตารางการส่งของ today/this week/next week
 * @returns JSX ของ delivery schedule
 */
function DeliverySchedule() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:w-28 sm:grid-cols-1">
      <div className="bg-success/10 flex flex-1 flex-col items-center justify-center rounded-lg border px-3 py-3 text-center">
        <p className="text-muted-foreground text-[0.6875rem]">Deliveries:</p>
        <p className="text-success text-2xl font-bold">
          {deliverySchedule.today}
        </p>
      </div>
      <div className="bg-primary/10 flex flex-1 flex-col items-center justify-center rounded-lg border px-3 py-3 text-center">
        <p className="text-muted-foreground text-[0.6875rem]">This Week</p>
        <p className="text-primary text-2xl font-bold">
          {deliverySchedule.thisWeek}
        </p>
      </div>
      <div className="bg-destructive/10 flex flex-1 flex-col items-center justify-center rounded-lg border px-3 py-3 text-center">
        <p className="text-muted-foreground text-[0.6875rem]">Next Week</p>
        <p className="text-destructive text-2xl font-bold">
          {deliverySchedule.nextWeek}
        </p>
      </div>
    </div>
  );
}

// ── Over-Received POs table ───────────────────────────────────────────────────

/**
 * ตารางแสดง POs ที่รับของเกินจำนวนที่สั่ง
 * @returns JSX ของตาราง over-received POs
 */
function OverReceivedTable() {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-xs font-semibold tracking-wide uppercase">
          Over-Received POs (Received &gt; Ordered)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[52rem] text-xs" aria-label="Over-received POs">
          <thead>
            <tr className="bg-muted/60 border-b">
              <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
                PO Number
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
                Material Name
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
                Material Code
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-semibold">
                Vendor Name
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-semibold">
                Ordered Qty
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-semibold">
                Received Qty
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-semibold">
                Variance
              </th>
              <th scope="col" className="py-1.5 text-left font-semibold">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {overReceivedPos.map((po, i) => (
              <tr
                key={`${po.poNumber}-${i}`}
                className="hover:bg-muted/40 border-b last:border-0"
              >
                <td className="py-1.5 pr-2 font-semibold">{po.poNumber}</td>
                <td className="py-1.5 pr-2">{po.materialName}</td>
                <td className="text-muted-foreground py-1.5 pr-2">
                  {po.materialCode}
                </td>
                <td className="py-1.5 pr-2">{po.vendorName}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {po.orderedQty}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {po.receivedQty}
                </td>
                <td className="text-success py-1.5 pr-2 text-right font-semibold tabular-nums">
                  +{po.variance}
                </td>
                <td className="py-1.5">
                  <Badge variant="warning-light" size="xs">
                    Variance Flagged
                  </Badge>
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
 * Component หลักของ PO dashboard รวม pipeline, tables, gauges และ charts ต่างๆ
 *
 * @param - ไม่มี parameter
 * @returns JSX ของ PO dashboard
 * @example
 * ```tsx
 * import { DashboardPo } from "./_components/dashboard-po";
 *
 * export default function Page() {
 *   return <DashboardPo />;
 * }
 * ```
 */
export function DashboardPo() {
  return (
    <div className="space-y-3 p-3">
      {/* Pipeline */}
      <PoPipeline />

      {/* Middle row: left tables + right metrics */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Left: 2 tables */}
        <Card className="gap-3 py-4">
          <CardContent className="space-y-4 px-4">
            <PendingPrsTable />
            <OverdueDeliveriesTable />
          </CardContent>
        </Card>

        {/* Right: KPIs + category spend + vendors + delivery schedule */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* Row 1: 2 KPI Gauges */}
          <div className="flex flex-col gap-3">
            <GaugeChart
              value={poKpi.onTimeDelivery}
              label="On-Time Delivery"
              color="var(--warning)"
            />
            <GaugeChart
              value={poKpi.orderCompleteness}
              label="Order Completeness"
              color="var(--success)"
            />
          </div>

          {/* Row 2: Category Spend (full width) */}
          <CategorySpendCard />

          {/* Row 3: Top Vendors + Delivery Schedule */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
            <Card className="gap-2 py-4">
              <CardContent className="px-4">
                <TopVendorsChart />
              </CardContent>
            </Card>
            <DeliverySchedule />
          </div>
        </div>
      </div>

      {/* Bottom: Over-received */}
      <OverReceivedTable />
    </div>
  );
}
