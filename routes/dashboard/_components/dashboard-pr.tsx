
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
  Settings,
  CheckCircle2,
  ShoppingCart,
  Package,
  CornerUpLeft,
  XCircle,
  ChevronRight,
  Bell,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  prPipelineSummary,
  sentBackPrs,
  rejectedPrs,
  personalSpending,
  departmentSpending,
  awaitingApprovalQueue,
  type PrPipelineKey,
  type AwaitingStatus,
} from "../mock/pr";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงิน USD แบบ en-US
 * @param value - ตัวเลขที่ต้องการจัดรูปแบบ
 * @returns สตริงสกุลเงินที่จัดรูปแบบแล้ว
 */
function formatCurrency(value: number) {
  return "$" + value.toLocaleString("en-US");
}

// ── Pipeline config ───────────────────────────────────────────────────────────

const PIPELINE_CONFIG: Record<
  PrPipelineKey,
  { icon: React.ReactNode; iconBg: string; barColor: string }
> = {
  requests: {
    icon: <FileText className="size-5" aria-hidden="true" />,
    iconBg: "var(--warning)",
    barColor: "var(--warning)",
  },
  in_process: {
    icon: <Settings className="size-5" aria-hidden="true" />,
    iconBg: "var(--primary)",
    barColor: "var(--primary)",
  },
  approved: {
    icon: <CheckCircle2 className="size-5" aria-hidden="true" />,
    iconBg: "var(--success)",
    barColor: "var(--success)",
  },
  po_generated: {
    icon: <ShoppingCart className="size-5" aria-hidden="true" />,
    iconBg: "var(--info)",
    barColor: "var(--info)",
  },
  received: {
    icon: <Package className="size-5" aria-hidden="true" />,
    iconBg: "var(--success)",
    barColor: "var(--success)",
  },
};

// ── Awaiting status config ────────────────────────────────────────────────────

const AWAITING_STATUS_CONFIG: Record<
  AwaitingStatus,
  { label: string; variant: "warning-light" | "info-light" }
> = {
  awaiting_hod: { label: "Awaiting HOD Approve", variant: "warning-light" },
  awaiting_po: { label: "Awaiting PO", variant: "info-light" },
};

// ── Donut & bar colors ────────────────────────────────────────────────────────

const SPENDING_COLORS = ["var(--chart-1)", "var(--chart-4)", "var(--chart-2)"];

// ── Pipeline Section ──────────────────────────────────────────────────────────

/**
 * Section แสดง pipeline สถานะของ Purchase Request เป็น horizontal bar พร้อม icon
 * @returns JSX ของ PR pipeline
 */
function PrPipeline() {
  const maxCount = Math.max(...prPipelineSummary.map((p) => p.count));

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          PR Summary (Status Pipeline)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:items-stretch lg:gap-0">
          {prPipelineSummary.map((item, index) => {
            const cfg = PIPELINE_CONFIG[item.key];
            const barWidth = Math.round((item.count / maxCount) * 100);
            const isLast = index === prPipelineSummary.length - 1;

            return (
              <div key={item.key} className="flex items-center lg:flex-1">
                <div className="bg-card flex flex-1 flex-col gap-2 rounded-lg border px-3 py-3 lg:px-4">
                  {/* Icon + label row */}
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
                  {/* Count */}
                  <p className="text-2xl leading-none font-bold">
                    {item.count}
                  </p>
                  {/* Progress bar */}
                  <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: cfg.barColor,
                      }}
                    />
                  </div>
                </div>
                {!isLast && (
                  <ArrowRight
                    className="text-muted-foreground mx-1 hidden size-4 shrink-0 lg:block"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Sent Back PRs table ───────────────────────────────────────────────────────

/**
 * ตารางแสดง PRs ที่ถูกส่งกลับ
 * @returns JSX ของตาราง sent back PRs
 */
function SentBackTable() {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase">
          Sent Back PRs
        </span>
        <span className="text-muted-foreground text-[0.6875rem]">
          Connects back to previous responses
        </span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-xs" aria-label="Sent back PRs">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              PR Number
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Item Name
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Date Sent
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Sender
            </th>
            <th scope="col" className="py-1.5 text-left font-medium">
              Reason
            </th>
          </tr>
        </thead>
        <tbody>
          {sentBackPrs.map((pr) => (
            <tr
              key={pr.prNumber}
              className="hover:bg-muted/40 border-b last:border-0"
            >
              <td className="py-1.5 pr-2">
                <div className="flex items-center gap-1">
                  <CornerUpLeft
                    className="text-muted-foreground size-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{pr.prNumber}</span>
                </div>
              </td>
              <td className="py-1.5 pr-2">{pr.itemName}</td>
              <td className="text-muted-foreground py-1.5 pr-2">
                {pr.dateSent}
              </td>
              <td className="py-1.5 pr-2">{pr.sender}</td>
              <td className="text-muted-foreground max-w-[10rem] truncate py-1.5">
                {pr.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Rejected PRs table ────────────────────────────────────────────────────────

/**
 * ตารางแสดง PRs และรายการที่ถูก reject
 * @returns JSX ของตาราง rejected PRs
 */
function RejectedTable() {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase">
          PRs Rejected &amp; Item Rejects
        </span>
        <span className="text-muted-foreground text-[0.6875rem]">
          Connects back to previous responses
        </span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-xs" aria-label="Rejected PRs">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              PR Number/Item ID
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Material Name
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Requester
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Rejected By
            </th>
            <th scope="col" className="py-1.5 text-left font-medium">
              Reason
            </th>
          </tr>
        </thead>
        <tbody>
          {rejectedPrs.map((pr) => (
            <tr
              key={pr.prNumberItemId}
              className="hover:bg-muted/40 border-b last:border-0"
            >
              <td className="py-1.5 pr-2">
                <div className="flex items-center gap-1">
                  <XCircle
                    className="text-destructive size-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{pr.prNumberItemId}</span>
                </div>
              </td>
              <td className="py-1.5 pr-2">{pr.materialName}</td>
              <td className="py-1.5 pr-2">{pr.requester}</td>
              <td className="py-1.5 pr-2">{pr.rejectedBy}</td>
              <td className="text-muted-foreground max-w-[10rem] truncate py-1.5">
                {pr.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Donut label ───────────────────────────────────────────────────────────────

/**
 * Render label เปอร์เซ็นต์นอก donut chart สำหรับ recharts
 * @param props - พารามิเตอร์จาก recharts (cx, cy, midAngle, percent ฯลฯ)
 * @returns JSX ของ text label หรือ null ถ้าค่าน้อยกว่าเกณฑ์
 */
const renderDonutLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  name: string;
}) => {
  const RADIAN = Math.PI / 180;
  // Label outside the donut
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={9}
      fill="currentColor"
    >
      {Math.round(percent * 100)}%
    </text>
  );
};

// ── Spending Charts ───────────────────────────────────────────────────────────

/**
 * Section แสดงกราฟการใช้จ่ายตามหมวดหมู่ (donut สำหรับ personal และ bar chart สำหรับ department)
 * @returns JSX ของ spending section
 */
function SpendingSection() {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4 pb-0">
        <CardTitle className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
          Spending by Category
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Donut — Personal */}
          <div className="space-y-1">
            <p className="text-[0.6875rem] font-semibold">
              MY SPENDING (PERSONAL)
            </p>
            <div className="flex items-center gap-2">
              <div className="h-36 w-36 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={personalSpending}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={58}
                      dataKey="value"
                      labelLine={false}
                      label={renderDonutLabel}
                    >
                      {personalSpending.map((item, i) => (
                        <Cell
                          key={item.name}
                          style={{
                            fill: SPENDING_COLORS[i % SPENDING_COLORS.length],
                          }}
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
              <div className="space-y-1.5">
                {personalSpending.map((item, i) => (
                  <div key={item.name} className="flex items-start gap-1.5">
                    <span
                      className="mt-0.5 size-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          SPENDING_COLORS[i % SPENDING_COLORS.length],
                      }}
                    />
                    <span className="text-[0.6875rem] leading-tight">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar — Department */}
          <div className="space-y-1">
            <p className="text-[0.6875rem] font-semibold">
              DEPARTMENT SPENDING (F&amp;B Dept)
            </p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart
                layout="vertical"
                data={departmentSpending}
                margin={{ top: 0, right: 55, bottom: 0, left: 0 }}
                barCategoryGap="20%"
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), "Amount"]}
                  contentStyle={{ fontSize: "0.6875rem" }}
                />
                <Bar
                  dataKey="amount"
                  radius={[0, 3, 3, 0]}
                  isAnimationActive={false}
                >
                  {departmentSpending.map((item, i) => (
                    <Cell
                      key={item.category}
                      style={{
                        fill: SPENDING_COLORS[i % SPENDING_COLORS.length],
                      }}
                    />
                  ))}
                  <LabelList
                    dataKey="amount"
                    position="right"
                    formatter={(v: number) => formatCurrency(v)}
                    style={{ fontSize: 9, fill: "hsl(var(--foreground))" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {[
                "Food (อาหาร)",
                "Beverage",
                "Guest Supply (ของใช้แขก) (F&B Dept)",
              ].map((label, i) => (
                <div key={label} className="flex items-center gap-1">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SPENDING_COLORS[i] }}
                  />
                  <span className="text-muted-foreground text-[0.6rem]">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Awaiting Approval Table ───────────────────────────────────────────────────

/**
 * ตารางแสดง PRs ที่รออนุมัติพร้อม status badge
 * @returns JSX ของตาราง awaiting approval
 */
function AwaitingApprovalTable() {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-semibold tracking-wide uppercase">
            PRs Awaiting Approval (Task Queue)
          </CardTitle>
          <div className="flex items-center gap-2">
            <button
              aria-label="Mark all"
              className="text-muted-foreground hover:text-foreground"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
            </button>
            <button
              aria-label="Notifications"
              className="text-muted-foreground hover:text-foreground"
            >
              <Bell className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[44rem] text-xs" aria-label="PRs awaiting approval">
          <thead>
            <tr className="bg-muted/60 border-b">
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                PR Number
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Item Name
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Requester
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Dept
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Date Requested ↓
              </th>
              <th scope="col" className="py-1.5 pr-2 text-left font-medium">
                Status
              </th>
              <th scope="col" className="py-1.5 text-left font-medium" />
            </tr>
          </thead>
          <tbody>
            {awaitingApprovalQueue.map((pr) => {
              const statusCfg = AWAITING_STATUS_CONFIG[pr.status];
              return (
                <tr
                  key={pr.prNumber}
                  className="hover:bg-muted/40 border-b last:border-0"
                >
                  <td className="py-1.5 pr-2 font-medium">{pr.prNumber}</td>
                  <td className="py-1.5 pr-2">{pr.itemName}</td>
                  <td className="py-1.5 pr-2">{pr.requester}</td>
                  <td className="text-muted-foreground py-1.5 pr-2">
                    {pr.dept}
                  </td>
                  <td className="text-muted-foreground py-1.5 pr-2">
                    {pr.dateRequested}
                  </td>
                  <td className="py-1.5 pr-2">
                    <Badge variant={statusCfg.variant} size="xs">
                      {statusCfg.label}
                    </Badge>
                  </td>
                  <td className="py-1.5">
                    <button className="text-primary flex items-center gap-0.5 hover:underline">
                      <span className="text-[0.6875rem]">Direct details</span>
                      <ChevronRight className="size-3" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Component หลักของ PR dashboard แสดง pipeline, sent back, rejected, spending และ awaiting approval
 *
 * @param - ไม่มี parameter
 * @returns JSX ของ PR dashboard
 * @example
 * ```tsx
 * import { DashboardPr } from "./_components/dashboard-pr";
 *
 * export default function Page() {
 *   return <DashboardPr />;
 * }
 * ```
 */
export function DashboardPr() {
  return (
    <div className="space-y-3 p-3">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-1 sm:flex-row">
        <div>
          <h1 className="text-base font-semibold sm:text-lg">
            MY PR – PERSONAL REQUISITIONS DASHBOARD
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Welcome back! Here&apos;s your PR update for March 12, 2026
          </p>
        </div>
        <p className="text-muted-foreground shrink-0 text-xs">
          Wednesday, Mar 12, 10:30 AM
        </p>
      </div>

      {/* Pipeline */}
      <PrPipeline />

      {/* Middle: tables + charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Left: two tables */}
        <Card className="gap-3 py-4">
          <CardContent className="space-y-4 px-4">
            <SentBackTable />
            <RejectedTable />
          </CardContent>
        </Card>

        {/* Right: spending charts */}
        <SpendingSection />
      </div>

      {/* Bottom: awaiting approval */}
      <AwaitingApprovalTable />
    </div>
  );
}
