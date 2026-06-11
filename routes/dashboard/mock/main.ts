// ── KPI Cards ──────────────────────────────────────────────────────────────

export const kpiData = {
  totalSpendThisMonth: {
    value: 1_250_000,
    changePercent: 12,
    changeDirection: "up" as const,
    label: "Total Spend This Month",
  },
  pendingPrCount: {
    value: 18,
    description: "HOD Approved, Awaiting Purchase",
    label: "Pending PRs Count",
  },
  openPoCount: {
    value: 32,
    description: "Waiting for Delivery",
    label: "Open POs Count",
  },
  budgetUtilization: {
    percent: 45,
    description: "45% of total budget used",
    label: "Actual Spend vs Budget (% ทั่วองค์กร)",
  },
};

// ── Donut Chart — Spend by Material Group ──────────────────────────────────

export const spendByMaterialGroup = [
  { name: "อาหาร (Food)", value: 35 },
  { name: "เครื่องดื่ม (Beverage)", value: 26 },
  { name: "ของใช้ (Supplies)", value: 23 },
  { name: "เคมีภัณฑ์ (Chemicals)", value: 15 },
  { name: "อื่นๆ (Others)", value: 1 },
];

// ── Horizontal Bar Chart — Spend by Business Unit / Department ─────────────

export const spendByDepartment = [
  { department: "Main Kitchen", amount: 1_250_000 },
  { department: "Hotel A", amount: 1_100_000 },
  { department: "Bar B", amount: 950_000 },
  { department: "F&B Outlet", amount: 500_000 },
  { department: "ผันดกรักคลัน", amount: 100_000 },
];

// ── PR Pipeline — Bottleneck Analysis ─────────────────────────────────────

export type PipelineStatus =
  | "saved"
  | "committed"
  | "awaiting_hod"
  | "awaiting_purchase"
  | "approved"
  | "rejected";

export interface PipelineItem {
  status: PipelineStatus;
  label: string;
  count: number;
  amount: number;
  isBottleneck?: boolean;
}

export const prPipeline: PipelineItem[] = [
  { status: "saved", label: "Saved", count: 9, amount: 120_000 },
  { status: "committed", label: "Committed", count: 19, amount: 120_000 },
  {
    status: "awaiting_hod",
    label: "Awaiting HOD",
    count: 32,
    amount: 350_000,
    isBottleneck: true,
  },
  {
    status: "awaiting_purchase",
    label: "Awaiting Purchase",
    count: 32,
    amount: 330_000,
    isBottleneck: true,
  },
  { status: "approved", label: "Approved", count: 6, amount: 2_000 },
  { status: "rejected", label: "Rejected", count: 1, amount: 10 },
];

// ── Table — Top 5 Vendors by Spend ────────────────────────────────────────

export interface TopVendor {
  name: string;
  totalSpend: number;
  poCount: number | string;
  avgDeliveryDays: number;
  status?: string;
}

export const topVendors: TopVendor[] = [
  {
    name: "Mock Kitchen Name",
    totalSpend: 1_250_000,
    poCount: "Status",
    avgDeliveryDays: 2.8,
    status: "active",
  },
  {
    name: "Hotel A",
    totalSpend: 1_250_000,
    poCount: 18,
    avgDeliveryDays: 4.5,
  },
  {
    name: "Awaiting Supplies",
    totalSpend: 1_010_000,
    poCount: 10,
    avgDeliveryDays: 7.5,
  },
  {
    name: "Awaiting Purchase",
    totalSpend: 750_000,
    poCount: 8,
    avgDeliveryDays: 4.5,
  },
  {
    name: "Chef Somchai",
    totalSpend: 150_000,
    poCount: 7,
    avgDeliveryDays: 8.8,
  },
];
