
import { useState } from "react";
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
  Package,
  XCircle,
  AlertCircle,
  FileStack,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  srPipeline,
  sentBackSrs,
  srRejectList,
  awaitingSrsToday,
  awaitingSrsWeek,
  awaitingSrsMonth,
  myConsumption,
  deptConsumption,
  srAwaitingReceived,
  myTemplates,
  type AwaitingTab,
} from "../mock/sr";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * จัดรูปแบบตัวเลขให้มีคอมม่าและทศนิยม 2 ตำแหน่ง
 * @param v - ตัวเลขที่ต้องการจัดรูปแบบ
 * @returns สตริงตัวเลขที่จัดรูปแบบแล้ว
 */
function fmtAmount(v: number) {
  return v.toLocaleString("en-US", { minimumFractionDigits: 2 });
}

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงิน USD
 * @param v - ตัวเลขที่ต้องการจัดรูปแบบ
 * @returns สตริงสกุลเงิน
 */
function fmtCurrency(v: number) {
  return "$" + v.toLocaleString("en-US");
}

// ── Pipeline config ───────────────────────────────────────────────────────────

const PIPELINE_ICONS = [
  <FileText key="requested" className="size-7" aria-hidden="true" />,
  <Settings key="in_process" className="size-7" aria-hidden="true" />,
  <CheckCircle2 key="approved" className="size-7" aria-hidden="true" />,
  <Package key="issued" className="size-7" aria-hidden="true" />,
];

const PIPELINE_BG = [
  "var(--warning)",
  "var(--primary)",
  "var(--success)",
  "var(--chart-2)",
];

// ── Chart colors ──────────────────────────────────────────────────────────────

const CONSUMPTION_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-4)"];

// ── SR Summary Pipeline ───────────────────────────────────────────────────────

/**
 * Section แสดง pipeline สถานะของ Store Requisition
 * @returns JSX ของ SR pipeline
 */
function SrPipeline() {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        SR Summary (Status Pipeline)
      </p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {srPipeline.map((item, i) => (
          <div
            key={item.key}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-white"
            style={{ backgroundColor: PIPELINE_BG[i] }}
          >
            <div className="shrink-0 opacity-90">{PIPELINE_ICONS[i]}</div>
            <div className="flex-1">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wide opacity-80">
                {item.label}
              </p>
              <p className="text-3xl font-bold leading-tight">{item.count}</p>
              <p className="text-[0.6rem] opacity-70">{item.sub}</p>
            </div>
            <ChevronRightIcon />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Icon chevron ขวาแบบ SVG สำหรับใช้ใน pipeline ของ SR
 * @returns JSX ของ chevron icon
 */
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 opacity-60">
      <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Sent Back SRs table ───────────────────────────────────────────────────────

/**
 * ตารางแสดง SRs ที่ถูกส่งกลับพร้อมปุ่ม bulk submit
 * @returns JSX ของตาราง sent back SRs
 */
function SentBackSrsTable() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide">Sent Back SRs</p>
        <Button size="xs" className="gap-1 bg-chart-2 text-white hover:bg-chart-2/90" style={{ backgroundColor: "var(--chart-2)" }}>
          <FileStack className="size-3" aria-hidden="true" />
          Bulk Submit
        </Button>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-xs" aria-label="Sent back SRs">
        <thead>
          <tr className="border-b bg-muted/60">
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">SR#</th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Requester</th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Date Sent</th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Sender</th>
            <th scope="col" className="py-1.5 text-left font-semibold">Reason</th>
          </tr>
        </thead>
        <tbody>
          {sentBackSrs.map((sr) => (
            <tr key={sr.srNumber} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-1.5 pr-2">
                <div className="flex items-center gap-1">
                  <AlertCircle className="size-3 shrink-0 text-warning-foreground" aria-hidden="true" />
                  <span className="font-semibold">{sr.srNumber}</span>
                </div>
              </td>
              <td className="py-1.5 pr-2">{sr.requester}</td>
              <td className="py-1.5 pr-2 text-muted-foreground">{sr.dateSent}</td>
              <td className="py-1.5 pr-2 text-muted-foreground">{sr.sender}</td>
              <td className="py-1.5 max-w-[10rem] truncate text-muted-foreground">{sr.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Reject List table ─────────────────────────────────────────────────────────

/**
 * ตารางแสดง SRs และ items ที่ถูก reject
 * @returns JSX ของตาราง reject list
 */
function RejectListTable() {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide">
        Reject List{" "}
        <span className="font-normal text-muted-foreground">(SRs &amp; Items)</span>
      </p>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-xs" aria-label="SR reject list">
        <thead>
          <tr className="border-b bg-muted/60">
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">SR#</th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Material Name</th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Requester</th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Rejected By</th>
            <th scope="col" className="py-1.5 text-left font-semibold">Reason</th>
          </tr>
        </thead>
        <tbody>
          {srRejectList.map((item, i) => (
            <tr key={`${item.srNumber ?? ""}-${i}`} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-1.5 pr-2">
                <div className="flex items-center gap-1">
                  <XCircle className="size-3 shrink-0 text-destructive" aria-hidden="true" />
                  <span className="font-semibold">{item.srNumber ?? ""}</span>
                </div>
              </td>
              <td className="py-1.5 pr-2 max-w-[9rem] truncate">{item.materialName}</td>
              <td className="py-1.5 pr-2">{item.requester}</td>
              <td className="py-1.5 pr-2">{item.rejectedBy}</td>
              <td className="py-1.5 max-w-[9rem] truncate text-muted-foreground">{item.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Awaiting Approval table ───────────────────────────────────────────────────

const AWAITING_TABS: { key: AwaitingTab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

const AWAITING_DATA = {
  today: awaitingSrsToday,
  week: awaitingSrsWeek,
  month: awaitingSrsMonth,
};

/**
 * ตารางแสดง SRs ที่รออนุมัติ มี tab today/week/month
 * @returns JSX ของตาราง awaiting approval
 */
function AwaitingApprovalTable() {
  const [tab, setTab] = useState<AwaitingTab>("today");
  const rows = AWAITING_DATA[tab];

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide">SRs Awaiting Approval</p>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-xs" aria-label="SRs awaiting approval">
        <thead>
          <tr className="border-b bg-muted/60">
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">PR No</th>
            <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Description</th>
            <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Amount</th>
            <th scope="col" className="py-1.5 text-left font-semibold">Stage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((sr) => (
            <tr key={sr.prNo} className="border-b last:border-0 hover:bg-muted/40">
              <td className="py-1.5 pr-2 font-semibold">{sr.prNo}</td>
              <td className="py-1.5 pr-2">{sr.description}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">{fmtAmount(sr.amount)}</td>
              <td className="py-1.5 text-muted-foreground">{sr.stage}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {/* Tabs */}
      <div className="flex items-center gap-1 pt-1">
        {AWAITING_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "rounded bg-primary px-3 py-1 text-[0.6875rem] font-semibold text-primary-foreground"
                : "rounded px-3 py-1 text-[0.6875rem] text-muted-foreground hover:bg-muted/60"
            }
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── My Consumption donut ──────────────────────────────────────────────────────

/**
 * Donut chart แสดงยอดการใช้งานส่วนบุคคลแยกตามหมวดหมู่
 * @returns JSX ของ my consumption chart
 */
function MyConsumptionChart() {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide">
        My Consumption{" "}
        <span className="font-normal text-muted-foreground">(Personal)</span>
      </p>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        <div className="relative h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={myConsumption.breakdown}
                cx="50%"
                cy="50%"
                innerRadius={44}
                outerRadius={68}
                dataKey="value"
                strokeWidth={0}
              >
                {myConsumption.breakdown.map((item, i) => (
                  <Cell key={item.name} style={{ fill: CONSUMPTION_COLORS[i] }} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[0.5625rem] leading-none text-muted-foreground">MY</span>
            <span className="text-[0.5625rem] leading-none text-muted-foreground">CONSUMPTION</span>
            <span className="text-sm font-bold leading-tight">{fmtCurrency(myConsumption.total)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-[0.6875rem] font-semibold text-muted-foreground">Consumption</p>
          {myConsumption.breakdown.map((item, i) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: CONSUMPTION_COLORS[i] }} />
              <span className="text-[0.6875rem]">{item.name}</span>
            </div>
          ))}
          <div className="mt-1 space-y-0.5 border-t pt-1">
            {myConsumption.breakdown.filter((_, i) => i < 2).map((item, i) => (
              <div key={`amt-${item.name}`} className="flex items-center gap-1.5">
                <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: CONSUMPTION_COLORS[i] }} />
                <span className="text-[0.6rem] text-muted-foreground">{fmtCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SR Awaiting Received table ────────────────────────────────────────────────

/**
 * ตารางแสดง SRs ที่รอรับของ
 * @returns JSX ของตาราง SR awaiting received
 */
function SrAwaitingReceivedTable() {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold">SR Awaiting Received</p>
      <div className="max-h-52 overflow-auto rounded border">
        <table className="w-full text-xs" aria-label="SR awaiting received">
          <thead className="sticky top-0 bg-muted/90">
            <tr className="border-b">
              <th scope="col" className="py-1.5 pl-2 pr-2 text-left font-semibold">PR No</th>
              <th scope="col" className="py-1.5 pr-2 text-left font-semibold">Description</th>
              <th scope="col" className="py-1.5 pr-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {srAwaitingReceived.map((sr, i) => (
              <tr key={`${sr.prNo}-${i}`} className="border-b last:border-0 hover:bg-muted/40">
                <td className="py-1.5 pl-2 pr-2 font-semibold">{sr.prNo}</td>
                <td className="py-1.5 pr-2">{sr.description}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">{sr.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Dept Consumption bar ──────────────────────────────────────────────────────

/**
 * Horizontal bar chart แสดงยอดการใช้งานของแผนก
 * @returns JSX ของ dept consumption chart
 */
function DeptConsumptionChart() {
  const max = Math.max(...deptConsumption.map((d) => d.amount));

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide">
        Dept Consumption{" "}
        <span className="font-normal text-muted-foreground">(F&amp;B Dept)</span>
      </p>
      <ResponsiveContainer width="100%" height={110}>
        <BarChart
          layout="vertical"
          data={deptConsumption}
          margin={{ top: 0, right: 55, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <XAxis type="number" domain={[0, max * 1.1]} hide />
          <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={60} />
          <Tooltip formatter={(v: number) => [fmtCurrency(v), "Amount"]} contentStyle={{ fontSize: "0.6875rem" }} />
          <Bar dataKey="amount" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {deptConsumption.map((item, i) => (
              <Cell key={item.category} style={{ fill: CONSUMPTION_COLORS[i % CONSUMPTION_COLORS.length] }} />
            ))}
            <LabelList
              dataKey="amount"
              position="right"
              formatter={(v: number) => fmtCurrency(v)}
              style={{ fontSize: 9, fill: "hsl(var(--foreground))" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-3">
        {deptConsumption.map((item, i) => (
          <div key={item.category} className="flex items-center gap-1">
            <span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: CONSUMPTION_COLORS[i] }} />
            <span className="text-[0.6rem] text-muted-foreground">{item.category}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── My Templates ──────────────────────────────────────────────────────────────

/**
 * Section แสดงรายการ templates ของผู้ใช้
 * @returns JSX ของ my templates
 */
function MyTemplates() {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide">My Templates</p>
      <div className="space-y-1">
        {myTemplates.map((t) => (
          <button
            key={t}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-muted/60"
          >
            <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>{t}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

/**
 * Footer ของ SR dashboard แสดงข้อมูล version และผู้ใช้
 * @returns JSX ของ footer
 */
function DashboardFooter() {
  return (
    <div className="flex flex-col items-start justify-between gap-1 rounded border bg-muted/40 px-3 py-1.5 text-[0.6rem] text-muted-foreground sm:flex-row sm:items-center">
      <span>Footer replicated and cleaned up, updated for Alex Wong</span>
      <span>Version: 3.4.1 | user | Alex Wong, SR Requester | Wednesday, Mar 12, 10:30 AM</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Component หลักของ SR dashboard รวม pipeline, tables และ charts ต่างๆ
 *
 * @param - ไม่มี parameter
 * @returns JSX ของ SR dashboard
 * @example
 * ```tsx
 * import { DashboardSr } from "./_components/dashboard-sr";
 *
 * export default function Page() {
 *   return <DashboardSr />;
 * }
 * ```
 */
export function DashboardSr() {
  return (
    <div className="space-y-3 p-3">
      {/* Pipeline */}
      <SrPipeline />

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_18rem_14rem]">
        {/* Left: Sent Back + Reject List + Awaiting Approval */}
        <Card className="min-w-0 gap-3 py-4">
          <CardContent className="min-w-0 space-y-4 px-4">
            <SentBackSrsTable />
            <RejectListTable />
            <AwaitingApprovalTable />
          </CardContent>
        </Card>

        {/* Middle: My Consumption + SR Awaiting Received */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:w-full xl:flex-col">
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <MyConsumptionChart />
            </CardContent>
          </Card>
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <SrAwaitingReceivedTable />
            </CardContent>
          </Card>
        </div>

        {/* Right: Dept Consumption + My Templates */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:w-full xl:flex-col">
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <DeptConsumptionChart />
            </CardContent>
          </Card>
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <MyTemplates />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <DashboardFooter />
    </div>
  );
}
