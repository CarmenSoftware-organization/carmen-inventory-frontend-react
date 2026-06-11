// ── KPI Cards ─────────────────────────────────────────────────────────────────

export const grnKpi = {
  receivingNow: 12,
  receivedToday: 45,
  grnMtd: 28,
  grnYtd: 1850,
};

// ── Pending Purchase Orders (tabbed: Today / This Week / Next Week) ───────────

export type PoPriority = "high" | "medium" | "low";

export interface PendingPo {
  poId: string;
  supplierName: string;
  expectedDate: string;
  itemsCount: number;
  totalAmount: number;
  priority: PoPriority;
}

export const pendingPoToday: PendingPo[] = [
  {
    poId: "PO1001",
    supplierName: "Global Grocers",
    expectedDate: "Oct 26, 2024",
    itemsCount: 2,
    totalAmount: 178,
    priority: "high",
  },
  {
    poId: "PO1002",
    supplierName: "Elite Beverages",
    expectedDate: "Oct 26, 2024",
    itemsCount: 10,
    totalAmount: 437,
    priority: "high",
  },
  {
    poId: "PO1003",
    supplierName: "Hospitality Co.",
    expectedDate: "Oct 26, 2024",
    itemsCount: 7,
    totalAmount: 133,
    priority: "medium",
  },
  {
    poId: "PO1004",
    supplierName: "Supreme Linen",
    expectedDate: "Oct 26, 2024",
    itemsCount: 6,
    totalAmount: 293,
    priority: "medium",
  },
];

export const pendingPoThisWeek: PendingPo[] = [
  {
    poId: "PO1005",
    supplierName: "Global Grocers",
    expectedDate: "Oct 27, 2024",
    itemsCount: 5,
    totalAmount: 520,
    priority: "high",
  },
  {
    poId: "PO1006",
    supplierName: "ABC Produce",
    expectedDate: "Oct 28, 2024",
    itemsCount: 8,
    totalAmount: 310,
    priority: "medium",
  },
  {
    poId: "PO1007",
    supplierName: "Star Linen",
    expectedDate: "Oct 29, 2024",
    itemsCount: 3,
    totalAmount: 145,
    priority: "low",
  },
];

export const pendingPoNextWeek: PendingPo[] = [
  {
    poId: "PO1008",
    supplierName: "Elite Beverages",
    expectedDate: "Nov 2, 2024",
    itemsCount: 12,
    totalAmount: 890,
    priority: "medium",
  },
  {
    poId: "PO1009",
    supplierName: "Hospitality Co.",
    expectedDate: "Nov 3, 2024",
    itemsCount: 4,
    totalAmount: 220,
    priority: "low",
  },
];

// ── Overdue Purchase Orders ───────────────────────────────────────────────────

export interface OverduePo {
  poId: string;
  supplier: string;
  originalDueDate: string;
  daysOverdue: number;
  itemsCount: number;
}

export const overduePos: OverduePo[] = [
  {
    poId: "PO1001",
    supplier: "Global Grocers",
    originalDueDate: "Oct 26, 2024",
    daysOverdue: 5,
    itemsCount: 7,
  },
  {
    poId: "PO1002",
    supplier: "Elite Beverages",
    originalDueDate: "Oct 21, 2024",
    daysOverdue: 8,
    itemsCount: 5,
  },
  {
    poId: "PO1003",
    supplier: "Hospitality Co.",
    originalDueDate: "Oct 22, 2024",
    daysOverdue: 12,
    itemsCount: 9,
  },
  {
    poId: "PO1004",
    supplier: "ABC Produce",
    originalDueDate: "Oct 17, 2024",
    daysOverdue: 12,
    itemsCount: 6,
  },
  {
    poId: "PO1005",
    supplier: "Supreme Linen",
    originalDueDate: "Oct 13, 2024",
    daysOverdue: 18,
    itemsCount: 11,
  },
];

// ── Incomplete GRNs (Partial Receipts) ────────────────────────────────────────

export interface IncompleteGrn {
  grnId: string;
  poId: string;
  supplier: string;
  qtyOrdered: number;
  qtyReceived: number;
  variancePercent: number;
}

export const incompleteGrns: IncompleteGrn[] = [
  {
    grnId: "GRN01",
    poId: "PO ID",
    supplier: "Global Grocers",
    qtyOrdered: 30,
    qtyReceived: 30,
    variancePercent: 0.2,
  },
  {
    grnId: "GRN02",
    poId: "PO ID",
    supplier: "ABC Produce",
    qtyOrdered: 20,
    qtyReceived: 15,
    variancePercent: 21.43,
  },
  {
    grnId: "GRN03",
    poId: "PO ID",
    supplier: "Supreme Linen",
    qtyOrdered: 1,
    qtyReceived: 1,
    variancePercent: 0.37,
  },
];

// ── Over-Received GRNs (Excess Receipts) ─────────────────────────────────────

export interface OverReceivedGrn {
  grnId: string;
  poId: string;
  supplier: string;
  poAmount: number;
  grnAmount: number;
  excessAmount: number;
  variancePercent: number;
}

export const overReceivedGrns: OverReceivedGrn[] = [
  {
    grnId: "GRN01",
    poId: "PO 1D",
    supplier: "Global Grocers",
    poAmount: 154,
    grnAmount: 307,
    excessAmount: 110,
    variancePercent: 0.1,
  },
  {
    grnId: "GRN02",
    poId: "PO 1D",
    supplier: "Elite Beverages",
    poAmount: 192,
    grnAmount: 344,
    excessAmount: -30,
    variancePercent: -3.79,
  },
  {
    grnId: "GRN03",
    poId: "PO 103",
    supplier: "Hospitality Co.",
    poAmount: 162,
    grnAmount: 183,
    excessAmount: -33,
    variancePercent: 3.38,
  },
];

// ── Top 5 Vendors by Purchase YTD ────────────────────────────────────────────

export const topVendorsYtd = [
  { name: "Global Grocers", amountM: 1.2 },
  { name: "Elite Beverages", amountM: 0.8 },
  { name: "Hospitality Co.", amountM: 0.68 },
  { name: "ABC Produce", amountM: 0.56 },
  { name: "Supreme Linen", amountM: 0.44 },
];

// ── Purchasing Spend by Category ──────────────────────────────────────────────

export const spendByCategory = [
  { category: "Food", currentMonth: 35, ytdTotal: 47 },
  { category: "Beverage", currentMonth: 25, ytdTotal: 38 },
  { category: "Guest Supply", currentMonth: 14, ytdTotal: 22 },
];
