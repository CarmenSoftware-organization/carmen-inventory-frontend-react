
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
  MapPin,
  CheckCircle2,
  FileX2,
  Timer,
  ShoppingCart,
  XCircle,
  ArrowRight,
  FilePlus2,
  PackagePlus,
  ExternalLink,
  CornerDownLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  inventoryPipeline,
  INVENTORY_LOCATIONS,
  slowMovingItems,
  replenishmentItems,
  pstRecords,
  inventoryByMaterialGroup,
  expiredItems,
  consumptionByLocation,
  srAwaitingReceipt,
  consumptionByCategory,
  type InventoryLocation,
  type PstStatus,
} from "../mock/inventory";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * จัดรูปแบบตัวเลขเป็นสกุลเงิน USD
 * @param v - ตัวเลขที่ต้องการจัดรูปแบบ
 * @returns สตริงสกุลเงิน
 */
function fmtCurrency(v: number) {
  return "$" + v.toLocaleString("en-US");
}

// ── PST Status config ─────────────────────────────────────────────────────────

const PST_STATUS_CONFIG: Record<
  PstStatus,
  { label: string; variant: "success-light" | "warning-light" | "info-light" }
> = {
  completed: { label: "Completed", variant: "success-light" },
  awaiting_approval: { label: "Awaiting Approval", variant: "warning-light" },
  in_progress: { label: "In Progress", variant: "info-light" },
};

// ── Chart colors ──────────────────────────────────────────────────────────────

const GROUP_COLORS = ["var(--chart-1)", "var(--chart-4)", "var(--chart-2)"];
const CATEGORY_COLORS = [
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-2)",
  "var(--chart-3)",
];

// ── Status Pipeline ───────────────────────────────────────────────────────────

const PIPELINE_ITEMS = [
  {
    key: "locationNotComplete",
    subLabel: "STOCK TAKE NOT COMPLETE",
    label: "Location count",
    value: inventoryPipeline.locationNotComplete,
    icon: <MapPin className="size-5" aria-hidden="true" />,
    bg: "var(--chart-4)",
  },
  {
    key: "locationComplete",
    subLabel: "STOCK TAKE COMPLETE",
    label: "Location count",
    value: inventoryPipeline.locationComplete,
    icon: <MapPin className="size-5" aria-hidden="true" />,
    bg: "var(--chart-2)",
  },
  {
    key: "uncommittedDocs",
    subLabel: "UNCOMMITTED DOCS - CURR MO.",
    label: "Doc count",
    value: inventoryPipeline.uncommittedDocs,
    icon: <FileX2 className="size-5" aria-hidden="true" />,
    bg: "var(--success)",
  },
  {
    key: "expiringItems",
    subLabel: "EXPIRING ITEMS - CURR MO.",
    label: "Item count",
    value: inventoryPipeline.expiringItems,
    icon: <Timer className="size-5" aria-hidden="true" />,
    bg: "var(--info)",
  },
  {
    key: "inventoryValue",
    subLabel: "CURR MO.",
    label: "Inventory Value",
    value: fmtCurrency(inventoryPipeline.inventoryValue),
    icon: <ShoppingCart className="size-5" aria-hidden="true" />,
    bg: "oklch(0.35 0.12 155)",
  },
];

/**
 * Section แสดง status pipeline ของ inventory พร้อม icon และตัวเลขสถิติ
 * @returns JSX ของ inventory pipeline
 */
function InventoryPipeline() {
  return (
    <div className="space-y-1.5">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Status Pipeline
      </p>
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:flex lg:items-stretch">
        {PIPELINE_ITEMS.map((item, index) => {
          const isLast = index === PIPELINE_ITEMS.length - 1;
          return (
            <div key={item.key} className="flex items-center lg:flex-1">
              <div
                className="flex flex-1 flex-col gap-1 rounded-lg px-3 py-2.5 text-white"
                style={{ backgroundColor: item.bg }}
              >
                <div className="flex items-center gap-1.5">
                  {item.icon}
                  <div>
                    <p className="text-[0.6rem] leading-none font-medium opacity-80">
                      {item.label}
                    </p>
                    <p className="text-[0.5625rem] leading-none opacity-70">
                      ({item.subLabel})
                    </p>
                  </div>
                </div>
                <p className="text-xl leading-none font-bold">{item.value}</p>
              </div>
              {!isLast && (
                <ArrowRight
                  className="text-muted-foreground mx-1 hidden size-3.5 shrink-0 lg:block"
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Location filter tabs ──────────────────────────────────────────────────────

/**
 * Tabs สำหรับเลือก location ของ inventory
 * @param props - location ที่ active และ callback เมื่อเปลี่ยน
 * @returns JSX ของ location tabs
 */
function LocationTabs({
  active,
  onChange,
}: {
  readonly active: InventoryLocation;
  readonly onChange: (l: InventoryLocation) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {INVENTORY_LOCATIONS.map((loc) => (
        <button
          key={loc}
          onClick={() => onChange(loc)}
          className={
            active === loc
              ? "border-border bg-foreground text-background rounded border px-2 py-0.5 text-[0.6875rem] font-semibold"
              : "border-border text-muted-foreground hover:bg-muted/60 rounded border px-2 py-0.5 text-[0.6875rem]"
          }
        >
          {loc}
        </button>
      ))}
    </div>
  );
}

// ── Slow-Moving / Dead Stock table ────────────────────────────────────────────

/**
 * ตารางแสดงสินค้า slow-moving / dead stock แยกตาม location
 * @returns JSX ของตาราง slow-moving
 */
function SlowMovingTable() {
  const [loc, setLoc] = useState<InventoryLocation>("Main Store");
  const rows =
    loc === "Main Store"
      ? slowMovingItems
      : slowMovingItems.filter((i) => i.location === loc);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide uppercase">
          Slow-Moving / Dead Stock{" "}
          <span className="text-muted-foreground font-normal">
            (Task Queue)
          </span>
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[0.6875rem]">
            SELECT LOCATION:
          </span>
          <LocationTabs active={loc} onChange={setLoc} />
        </div>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-xs" aria-label="Slow-moving dead stock">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Item Name
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              SKU
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Location
            </th>
            <th scope="col" className="py-1.5 pr-2 text-right font-medium">
              Days No Movement
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Est. Value
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr
              key={`${item.itemName}-${item.sku}`}
              className="hover:bg-muted/40 border-b last:border-0"
            >
              <td className="py-1.5 pr-2">
                <div className="flex items-center gap-1">
                  <XCircle
                    className="text-destructive size-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item.itemName}</span>
                </div>
              </td>
              <td className="text-muted-foreground py-1.5 pr-2">{item.sku}</td>
              <td className="py-1.5 pr-2">{item.location}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {item.daysNoMovement}
              </td>
              <td className="py-1.5 text-right font-medium tabular-nums">
                {fmtCurrency(item.estValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Replenishment table ───────────────────────────────────────────────────────

/**
 * ตารางแสดงสินค้าที่ต้อง replenishment (ต่ำกว่า par level)
 * @returns JSX ของตาราง replenishment
 */
function ReplenishmentTable() {
  const [loc, setLoc] = useState<InventoryLocation>("Main Store");

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide uppercase">
          Inventory Replenishment{" "}
          <span className="text-muted-foreground font-normal">(Below Par)</span>
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-[0.6875rem]">
            LOCATION:
          </span>
          <LocationTabs active={loc} onChange={setLoc} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="xs"
          className="bg-warning text-warning-foreground hover:bg-warning/90 gap-1"
        >
          <FilePlus2 className="size-3" aria-hidden="true" />
          CREATE PR
        </Button>
        <Button
          size="xs"
          className="bg-success hover:bg-success/90 gap-1 text-white"
        >
          <PackagePlus className="size-3" aria-hidden="true" />
          CREATE PR
        </Button>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[44rem] text-xs" aria-label="Inventory replenishment">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Item Name
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              SKU
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Location
            </th>
            <th scope="col" className="py-1.5 pr-2 text-right font-medium">
              On Hand
            </th>
            <th scope="col" className="py-1.5 pr-2 text-right font-medium">
              Par Level
            </th>
            <th scope="col" className="py-1.5 pr-2 text-right font-medium">
              Max Level
            </th>
            <th scope="col" className="py-1.5 text-right font-medium">
              Order Qty
            </th>
          </tr>
        </thead>
        <tbody>
          {replenishmentItems.map((item) => (
            <tr
              key={item.sku}
              className="hover:bg-muted/40 border-b last:border-0"
            >
              <td className="py-1.5 pr-2">
                <div className="flex items-center gap-1">
                  <CheckCircle2
                    className="text-success size-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item.itemName}</span>
                </div>
              </td>
              <td className="text-muted-foreground py-1.5 pr-2">{item.sku}</td>
              <td className="py-1.5 pr-2">{item.location}</td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {item.onHand}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {item.parLevel}
              </td>
              <td className="py-1.5 pr-2 text-right tabular-nums">
                {item.maxLevel}
              </td>
              <td className="text-muted-foreground py-1.5 text-right tabular-nums">
                {item.orderQty || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── PST Status table ──────────────────────────────────────────────────────────

/**
 * ตารางแสดงสถานะของ Physical Stock Take (PST)
 * @returns JSX ของตาราง PST status
 */
function PstStatusTable() {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide uppercase">
          Physical Stock Take Status{" "}
          <span className="text-muted-foreground font-normal">
            (PST Process)
          </span>
        </p>
        <div className="text-destructive flex items-center gap-1 text-[0.6875rem]">
          <CornerDownLeft className="size-3" aria-hidden="true" />
          <span>Connects back to previous responses</span>
        </div>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-xs" aria-label="Physical stock take status">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Location
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Dept
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Last Count Date
            </th>
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              PST Status
            </th>
            <th scope="col" className="py-1.5 text-left font-medium">
              SVF Name
            </th>
          </tr>
        </thead>
        <tbody>
          {pstRecords.map((r) => {
            const cfg = PST_STATUS_CONFIG[r.pstStatus];
            return (
              <tr
                key={r.location}
                className="hover:bg-muted/40 border-b last:border-0"
              >
                <td className="py-1.5 pr-2">
                  <div className="flex items-center gap-1">
                    <XCircle
                      className="text-destructive size-3 shrink-0"
                      aria-hidden="true"
                    />
                    <span>{r.location}</span>
                  </div>
                </td>
                <td className="text-muted-foreground py-1.5 pr-2">{r.dept}</td>
                <td className="text-muted-foreground py-1.5 pr-2">
                  {r.lastCountDate}
                </td>
                <td className="py-1.5 pr-2">
                  <Badge variant={cfg.variant} size="xs">
                    {cfg.label}
                  </Badge>
                </td>
                <td className="text-muted-foreground py-1.5">{r.svfName}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Inventory Value donut + bar ───────────────────────────────────────────────

/**
 * Render label เปอร์เซ็นต์ใน donut chart สำหรับ recharts
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
  if (percent < 0.08) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={10}
      fontWeight="600"
    >
      {Math.round(percent * 100)}%
    </text>
  );
};

/**
 * Chart รวม donut และ bar แสดงมูลค่า inventory แยกตาม material group
 * @returns JSX ของ inventory value chart
 */
function InventoryValueChart() {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold tracking-wide uppercase">
        Inventory Value by Material Group
      </p>
      <div className="flex flex-col items-start gap-3 sm:flex-row">
        {/* Donut */}
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={inventoryByMaterialGroup}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={68}
                dataKey="value"
                labelLine={false}
                label={renderDonutLabel}
                strokeWidth={0}
              >
                {inventoryByMaterialGroup.map((item, i) => (
                  <Cell
                    key={item.shortName}
                    style={{ fill: GROUP_COLORS[i % GROUP_COLORS.length] }}
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
        {/* Bar + legend */}
        <div className="w-full min-w-0 flex-1 space-y-2">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart
              data={inventoryByMaterialGroup}
              margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
              barCategoryGap="20%"
            >
              <XAxis
                dataKey="shortName"
                tick={{ fontSize: 8 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide />
              <Tooltip
                formatter={(v: number) => [fmtCurrency(v), "Amount"]}
                contentStyle={{ fontSize: "0.6875rem" }}
              />
              <Bar
                dataKey="amount"
                radius={[3, 3, 0, 0]}
                isAnimationActive={false}
              >
                {inventoryByMaterialGroup.map((item, i) => (
                  <Cell
                    key={item.shortName}
                    style={{ fill: GROUP_COLORS[i % GROUP_COLORS.length] }}
                  />
                ))}
                <LabelList
                  dataKey="amount"
                  position="top"
                  formatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
                  style={{ fontSize: 8, fill: "hsl(var(--foreground))" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-1">
            {inventoryByMaterialGroup.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="size-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: GROUP_COLORS[i] }}
                />
                <span className="text-[0.6rem]">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Expired Items Alert ───────────────────────────────────────────────────────

/**
 * ตารางแสดงรายการสินค้าที่หมดอายุหรือใกล้หมดอายุ
 * @returns JSX ของ expired items alert
 */
function ExpiredItemsAlert() {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold tracking-wide uppercase">
        Expired Items Alert{" "}
        <span className="text-muted-foreground font-normal">
          (Lot/Exp Master)
        </span>
      </p>
      <table className="w-full text-xs" aria-label="Expired items alert">
        <thead>
          <tr className="bg-muted/60 border-b">
            <th scope="col" className="py-1.5 pr-2 text-left font-medium">
              Item Name
            </th>
            <th scope="col" className="py-1.5 text-left font-medium">
              Expiry Date
            </th>
          </tr>
        </thead>
        <tbody>
          {expiredItems.map((item, i) => (
            <tr
              key={`${item.itemName}-${i}`}
              className="hover:bg-muted/40 border-b last:border-0"
            >
              <td className="py-1.5 pr-2">
                <div className="flex items-center gap-1">
                  <XCircle
                    className="text-destructive size-3 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item.itemName}</span>
                </div>
              </td>
              <td className="text-muted-foreground py-1.5">
                {item.expiryDate}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Consumption by Location chart ─────────────────────────────────────────────

/**
 * Horizontal bar chart แสดงยอดการใช้งานแยกตาม location
 * @returns JSX ของ consumption by location chart
 */
function ConsumptionByLocationChart() {
  const max = Math.max(...consumptionByLocation.map((d) => d.amount));
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold">
        Total Consumption by Location{" "}
        <span className="text-muted-foreground font-normal">
          (Cur MO vs YTD)
        </span>
      </p>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart
          layout="vertical"
          data={consumptionByLocation}
          margin={{ top: 0, right: 55, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <XAxis type="number" domain={[0, max * 1.1]} hide />
          <YAxis
            type="category"
            dataKey="location"
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            formatter={(v: number) => [fmtCurrency(v), "Amount"]}
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
              formatter={(v: number) => fmtCurrency(v)}
              style={{ fontSize: 9, fill: "hsl(var(--foreground))" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Consumption by Category chart ─────────────────────────────────────────────

/**
 * Horizontal bar chart แสดงยอดการใช้งานแยกตามหมวดหมู่ พร้อม SR awaiting receipt list
 * @returns JSX ของ consumption by category chart
 */
function ConsumptionByCategoryChart() {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold">Total Consumption by Category</p>
      </div>
      {/* SR Awaiting Receipt */}
      <div className="bg-muted/40 rounded border px-2 py-1">
        <div className="flex items-center justify-between text-[0.6875rem]">
          <span className="text-muted-foreground font-medium">
            SR# Awaiting Receipt
          </span>
          <span className="text-muted-foreground font-medium">Details</span>
        </div>
        {srAwaitingReceipt.map((sr) => (
          <div
            key={sr.srNumber}
            className="flex items-center justify-between text-[0.6875rem]"
          >
            <span className="font-medium">{sr.srNumber}</span>
            <button className="text-primary flex items-center gap-0.5 hover:underline">
              <span>{sr.details}</span>
              <ExternalLink className="size-2.5" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart
          layout="vertical"
          data={consumptionByCategory}
          margin={{ top: 0, right: 50, bottom: 0, left: 0 }}
          barCategoryGap="20%"
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="category"
            tick={{ fontSize: 9 }}
            tickLine={false}
            axisLine={false}
            width={60}
          />
          <Tooltip
            formatter={(v: number) => [fmtCurrency(v), "Amount"]}
            contentStyle={{ fontSize: "0.6875rem" }}
          />
          <Bar dataKey="amount" radius={[0, 3, 3, 0]} isAnimationActive={false}>
            {consumptionByCategory.map((item, i) => (
              <Cell
                key={item.category}
                style={{ fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
              />
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
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Component หลักของ Inventory dashboard รวม pipeline, tables และ charts ต่างๆ
 *
 * @param - ไม่มี parameter
 * @returns JSX ของ inventory dashboard
 * @example
 * ```tsx
 * import { DashboardInventory } from "./_components/dashboard-inventory";
 *
 * export default function Page() {
 *   return <DashboardInventory />;
 * }
 * ```
 */
export function DashboardInventory() {
  return (
    <div className="space-y-3 p-3">
      {/* Pipeline */}
      <InventoryPipeline />

      {/* Main 3-column layout */}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_18rem_15rem]">
        {/* Left: 3 tables */}
        <Card className="min-w-0 gap-3 py-4">
          <CardContent className="min-w-0 space-y-4 px-4">
            <SlowMovingTable />
            <ReplenishmentTable />
            <PstStatusTable />
          </CardContent>
        </Card>

        {/* Middle: inventory value chart + expired items */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:w-full xl:flex-col">
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <InventoryValueChart />
            </CardContent>
          </Card>
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <ExpiredItemsAlert />
            </CardContent>
          </Card>
        </div>

        {/* Right: consumption charts */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:w-full xl:flex-col">
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <ConsumptionByLocationChart />
            </CardContent>
          </Card>
          <Card className="gap-2 py-4">
            <CardContent className="px-4">
              <ConsumptionByCategoryChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
