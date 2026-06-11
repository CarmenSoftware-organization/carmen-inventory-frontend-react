
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import {
  ArrowRight,
  CheckCircle2,
  CalendarDays,
  Package,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  grnKpi,
  pendingPoToday,
  pendingPoThisWeek,
  pendingPoNextWeek,
  overduePos,
  incompleteGrns,
  overReceivedGrns,
  topVendorsYtd,
  spendByCategory,
  type PoPriority,
} from "../mock/grn";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงิน USD ทศนิยม 2 ตำแหน่ง
 * @param value - ตัวเลขที่ต้องการจัดรูปแบบ
 * @returns สตริงสกุลเงินที่จัดรูปแบบแล้ว
 */
function fmt$(value: number) {
  return "$" + value.toFixed(2);
}

// ── Priority badge config ─────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  PoPriority,
  { label: string; variant: "destructive" | "warning-light" | "outline" }
> = {
  high: { label: "High", variant: "destructive" },
  medium: { label: "Medium", variant: "warning-light" },
  low: { label: "Low", variant: "outline" },
};

// ── KPI Cards ─────────────────────────────────────────────────────────────────

/**
 * การ์ด KPI ของ GRN แสดง receiving now, received today, MTD และ YTD
 * @returns JSX ของ KPI cards
 */
function GrnKpiCards() {
  const cards = [
    {
      num: 1,
      label: "RECEIVING NOW",
      value: grnKpi.receivingNow,
      icon: <ArrowRight className="size-6" aria-hidden="true" />,
      iconColor: "var(--primary)",
    },
    {
      num: 2,
      label: "RECEIVED TODAY",
      value: grnKpi.receivedToday,
      icon: <CheckCircle2 className="size-6" aria-hidden="true" />,
      iconColor: "var(--success)",
    },
    {
      num: 3,
      label: "GRN TOTAL (MTD)",
      value: grnKpi.grnMtd,
      icon: <CalendarDays className="size-6" aria-hidden="true" />,
      iconColor: "var(--muted-foreground)",
    },
    {
      num: 4,
      label: "GRN TOTAL (YTD)",
      value: grnKpi.grnYtd.toLocaleString(),
      icon: <Package className="size-6" aria-hidden="true" />,
      iconColor: "var(--chart-4)",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.num}
          className="bg-card flex items-center gap-3 rounded-lg border px-4 py-3"
        >
          <span className="text-muted-foreground text-sm font-bold">
            {c.num}
          </span>
          <div className="flex-1">
            <p className="text-muted-foreground text-[0.6875rem] font-semibold tracking-wide uppercase">
              {c.label}
            </p>
            <p className="text-2xl leading-tight font-bold">{c.value}</p>
          </div>
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full"
            style={{ color: c.iconColor, border: `2px solid ${c.iconColor}` }}
          >
            {c.icon}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pending PO tabs ───────────────────────────────────────────────────────────

type PendingTab = "today" | "this_week" | "next_week";

const PENDING_TABS: { key: PendingTab; label: string }[] = [
  { key: "today", label: "TODAY" },
  { key: "this_week", label: "THIS WEEK" },
  { key: "next_week", label: "NEXT WEEK" },
];

const PENDING_DATA: Record<PendingTab, typeof pendingPoToday> = {
  today: pendingPoToday,
  this_week: pendingPoThisWeek,
  next_week: pendingPoNextWeek,
};

/**
 * ตารางแสดง Pending Purchase Orders แบบมี tab today/this week/next week
 * @returns JSX ของตาราง pending PO
 */
function PendingPoTable() {
  const [activeTab, setActiveTab] = useState<PendingTab>("today");
  const rows = PENDING_DATA[activeTab];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide uppercase">
        Pending Purchase Orders (PO)
      </p>
      {/* Tabs */}
      <div className="grid grid-cols-3 overflow-hidden rounded-md border text-[0.6875rem] font-semibold">
        {PENDING_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key
                ? "bg-foreground text-background py-1.5 text-center"
                : "text-muted-foreground hover:bg-muted/60 py-1.5 text-center"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-160 text-xs"
          aria-label="Pending purchase orders"
        >
          <thead>
            <tr className="bg-muted/60 border-b">
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                PO ID
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Supplier Name
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Expected Date
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                Items Count
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                Total Amount
              </th>
              <th scope="col" className="py-1.5 text-left font-medium">
                Priority
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((po) => {
              const pCfg = PRIORITY_CONFIG[po.priority];
              return (
                <tr
                  key={po.poId}
                  className="hover:bg-muted/40 border-b last:border-0"
                >
                  <td className="py-1.5 pr-2 font-medium">{po.poId}</td>
                  <td className="py-1.5 pr-2">{po.supplierName}</td>
                  <td className="text-muted-foreground py-1.5 pr-2">
                    {po.expectedDate}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {po.itemsCount}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {fmt$(po.totalAmount)}
                  </td>
                  <td className="py-1.5">
                    <Badge variant={pCfg.variant} size="xs">
                      {pCfg.label}
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

// ── Overdue POs table ─────────────────────────────────────────────────────────

const OVERDUE_THRESHOLD = 10;

/**
 * ตารางแสดง Purchase Orders ที่ค้างเกินกำหนด พร้อม highlight ที่ critical
 * @returns JSX ของตาราง overdue PO
 */
function OverduePoTable() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide uppercase">
        Overdue Purchase Orders
      </p>
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-xl text-xs"
          aria-label="Overdue purchase orders"
        >
          <thead>
            <tr className="bg-muted/60 border-b">
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                PO ID
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Supplier
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Original Due Date
              </th>
              <th
                scope="col"
                className="text-destructive py-1.5 pr-2 text-left font-medium"
              >
                Days Overdue
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Items Count
              </th>
            </tr>
          </thead>
          <tbody>
            {overduePos.map((po) => {
              const isCritical = po.daysOverdue >= OVERDUE_THRESHOLD;
              return (
                <tr
                  key={po.poId}
                  className={
                    isCritical
                      ? "bg-destructive/5 hover:bg-destructive/10 border-b last:border-0"
                      : "hover:bg-muted/40 border-b last:border-0"
                  }
                >
                  <td className="py-1.5 pr-2 font-medium">{po.poId}</td>
                  <td className="py-1.5 pr-2">{po.supplier}</td>
                  <td className="text-muted-foreground py-1.5 pr-2">
                    {po.originalDueDate}
                  </td>
                  <td className="py-1.5 pr-2">
                    {isCritical ? (
                      <Badge variant="destructive-light" size="xs">
                        OVERDUE
                      </Badge>
                    ) : (
                      <span className="text-destructive font-semibold">
                        {po.daysOverdue}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">
                    {po.itemsCount}
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

// ── Incomplete GRNs table ─────────────────────────────────────────────────────

/**
 * ตารางแสดง GRN ที่รับไม่ครบจำนวน (partial receipts)
 * @returns JSX ของตาราง incomplete GRNs
 */
function IncompleteGrnsTable() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide uppercase">
        Incomplete GRNs (Partial Receipts)
      </p>
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-176 text-xs"
          aria-label="Incomplete GRNs"
        >
          <thead>
            <tr className="bg-muted/60 border-b">
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                GRN ID
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                PO ID
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Supplier
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                Qty Ordered
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                Qty Received
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                Variance
              </th>
              <th scope="col" className="py-1.5 text-left font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {incompleteGrns.map((g) => (
              <tr
                key={g.grnId}
                className="hover:bg-muted/40 border-b last:border-0"
              >
                <td className="py-1.5 pr-2 font-medium">{g.grnId}</td>
                <td className="text-muted-foreground py-1.5 pr-2">{g.poId}</td>
                <td className="py-1.5 pr-2">{g.supplier}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {g.qtyOrdered}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {g.qtyReceived}
                </td>
                <td className="text-muted-foreground py-1.5 pr-2 text-right tabular-nums">
                  {g.variancePercent.toFixed(2)}%
                </td>
                <td className="py-1.5">
                  <Badge variant="info-light" size="xs">
                    Partially Received
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Over-received GRNs table ──────────────────────────────────────────────────

/**
 * ตารางแสดง GRN ที่รับเกินจำนวน (excess receipts)
 * @returns JSX ของตาราง over-received GRNs
 */
function OverReceivedGrnsTable() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide uppercase">
        Over-Received GRNs (Excess Receipts)
      </p>
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-3xl text-xs"
          aria-label="Over-received GRNs"
        >
          <thead>
            <tr className="bg-muted/60 border-b">
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                GRN ID
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                PO ID
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Supplier
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                PO Amount
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                GRN Amount
              </th>
              <th scope="col" className="py-1.5 pr-2 text-right font-medium">
                Excess Amount
              </th>
              <th scope="col" className="py-1.5 text-right font-medium">
                Variance %
              </th>
            </tr>
          </thead>
          <tbody>
            {overReceivedGrns.map((g) => {
              const excessNeg = g.excessAmount < 0;
              const varNeg = g.variancePercent < 0;
              return (
                <tr
                  key={g.grnId}
                  className="hover:bg-muted/40 border-b last:border-0"
                >
                  <td className="py-1.5 pr-2">
                    <div className="flex items-center gap-1">
                      <AlertTriangle
                        className="text-warning-foreground size-3 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="font-medium">{g.grnId}</span>
                    </div>
                  </td>
                  <td className="text-muted-foreground py-1.5 pr-2">
                    {g.poId}
                  </td>
                  <td className="py-1.5 pr-2">{g.supplier}</td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {fmt$(g.poAmount)}
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">
                    {fmt$(g.grnAmount)}
                  </td>
                  <td
                    className={
                      "py-1.5 pr-2 text-right font-semibold tabular-nums " +
                      (excessNeg ? "text-destructive" : "text-foreground")
                    }
                  >
                    {excessNeg ?? ""}
                    {fmt$(g.excessAmount)}
                  </td>
                  <td
                    className={
                      "py-1.5 text-right font-semibold tabular-nums " +
                      (varNeg ? "text-destructive" : "text-muted-foreground")
                    }
                  >
                    {g.variancePercent.toFixed(2)}%
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

// ── Top 5 Vendors horizontal bar ──────────────────────────────────────────────

/**
 * Horizontal bar chart แสดง 5 vendors ที่มียอดซื้อสูงสุด YTD
 * @returns JSX ของ top vendors chart
 */
function TopVendorsChart() {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold tracking-wide uppercase">
        Top 5 Vendors by Purchase YTD (USD Millions)
      </p>
      <ResponsiveContainer width="100%" height={155}>
        <BarChart
          layout="vertical"
          data={topVendorsYtd}
          margin={{ top: 0, right: 50, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <XAxis
            type="number"
            tick={{ fontSize: 9 }}
            tickFormatter={(v: number) => `$${v}M`}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip
            formatter={(v: number) => [`$${v}M`, "YTD Spend"]}
            contentStyle={{ fontSize: "0.6875rem" }}
          />
          <Bar
            dataKey="amountM"
            radius={[0, 3, 3, 0]}
            isAnimationActive={false}
            style={{ fill: "var(--chart-1)" }}
          >
            <LabelList
              dataKey="amountM"
              position="right"
              formatter={(v: number) => `$${v}M`}
              style={{ fontSize: 9, fill: "hsl(var(--foreground))" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Spend by Category grouped bar ────────────────────────────────────────────

/**
 * Grouped bar chart แสดงยอดซื้อแยกตามหมวดหมู่ เปรียบเทียบเดือนปัจจุบันกับ YTD
 * @returns JSX ของ spend by category chart
 */
function SpendByCategoryChart() {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold tracking-wide uppercase">
          Purchasing Spend by Category
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: "var(--chart-1)" }}
            />
            <span className="text-muted-foreground text-[0.6rem]">
              CURRENT MONTH
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="size-2.5 rounded-sm"
              style={{ backgroundColor: "var(--chart-1)", opacity: 0.4 }}
            />
            <span className="text-muted-foreground text-[0.6rem]">
              YTD TOTAL
            </span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={155}>
        <BarChart
          data={spendByCategory}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="25%"
          barGap={2}
        >
          <XAxis
            dataKey="category"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 9 }}
            tickFormatter={(v: number) => `$${v}`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v: number) => [`$${v}K`, ""]}
            contentStyle={{ fontSize: "0.6875rem" }}
          />
          <Bar
            dataKey="currentMonth"
            name="Current Month"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            style={{ fill: "var(--chart-1)" }}
          />
          <Bar
            dataKey="ytdTotal"
            name="YTD Total"
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            style={{ fill: "var(--chart-1)", opacity: 0.4 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Component หลักของ GRN dashboard รวม KPI, pending/overdue PO, incomplete/over-received GRN และ charts
 *
 * @param - ไม่มี parameter
 * @returns JSX ของ GRN dashboard
 * @example
 * ```tsx
 * import { DashboardGrn } from "./_components/dashboard-grn";
 *
 * export default function Page() {
 *   return <DashboardGrn />;
 * }
 * ```
 */
export function DashboardGrn() {
  return (
    <div className="space-y-3 p-3">
      {/* KPI Cards */}
      <GrnKpiCards />

      {/* Row 2: Pending PO (left) + Overdue PO (right) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <PendingPoTable />
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <OverduePoTable />
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Incomplete GRNs (left) + Over-received GRNs (right) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <IncompleteGrnsTable />
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <OverReceivedGrnsTable />
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Top Vendors (left) + Spend by Category (right) */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <TopVendorsChart />
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <SpendByCategoryChart />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
