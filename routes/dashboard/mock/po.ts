// ── PO Pipeline Summary ───────────────────────────────────────────────────────

export type PoPipelineKey =
  | "not_sent"
  | "sent"
  | "partial"
  | "closed"
  | "completed"
  | "rejected";

export interface PoPipelineItem {
  key: PoPipelineKey;
  label: string;
  count: number;
}

export const poPipelineSummary: PoPipelineItem[] = [
  { key: "not_sent", label: "NOT SENT", count: 12 },
  { key: "sent", label: "SENT", count: 18 },
  { key: "partial", label: "PARTIAL", count: 10 },
  { key: "closed", label: "CLOSED", count: 25 },
  { key: "completed", label: "COMPLETED", count: 30 },
  { key: "rejected", label: "REJECTED", count: 10 },
];

// ── Pending PRs for PO Creation ───────────────────────────────────────────────

export type PendingPoStatus = "pending_po" | "hold_for_info" | "overdue_followup";

export interface PendingPrForPo {
  prId: string;
  requester: string;
  dept: string;
  dateApproved: string;
  status: PendingPoStatus;
  isRejected?: boolean;
}

export const pendingPrsForPo: PendingPrForPo[] = [
  {
    prId: "PR-2300005",
    requester: "Sarah L.",
    dept: "Department Center",
    dateApproved: "Mar 12, 2026",
    status: "pending_po",
  },
  {
    prId: "PR-2300010",
    requester: "Michael B.",
    dept: "F&B Dept",
    dateApproved: "Mar 12, 2026",
    status: "hold_for_info",
  },
  {
    prId: "PR-2300025",
    requester: "David C.",
    dept: "F&B Dept",
    dateApproved: "Mar 12, 2026",
    status: "hold_for_info",
  },
  {
    prId: "PR-2300005",
    requester: "Maria G.",
    dept: "Dishwashing Liquid",
    dateApproved: "Mar 12, 2026",
    status: "overdue_followup",
    isRejected: true,
  },
];

// ── Overdue Deliveries ────────────────────────────────────────────────────────

export interface OverdueDelivery {
  poId: string;
  vendor: string;
  dept: string;
  dueDate: string;
  daysOverdue: number;
}

export const overdueDeliveries: OverdueDelivery[] = [
  {
    poId: "PO-230005...",
    vendor: "ABC Catering",
    dept: "Department Center",
    dueDate: "Oct 26, 2020",
    daysOverdue: 5,
  },
  {
    poId: "PO-230002...",
    vendor: "XYZ Linen",
    dept: "F&B Dept",
    dueDate: "Oct 26, 2020",
    daysOverdue: 5,
  },
  {
    poId: "PO-230003...",
    vendor: "Star Produce",
    dept: "Star Produce",
    dueDate: "Oct 26, 2020",
    daysOverdue: 5,
  },
  {
    poId: "PO-230004...",
    vendor: "Premier Supplies",
    dept: "Premier Supplies",
    dueDate: "Oct 26, 2020",
    daysOverdue: 5,
  },
];

// ── Over-Received POs ─────────────────────────────────────────────────────────

export interface OverReceivedPo {
  poNumber: string;
  materialName: string;
  materialCode: string;
  vendorName: string;
  orderedQty: number;
  receivedQty: number;
  variance: number;
}

export const overReceivedPos: OverReceivedPo[] = [
  {
    poNumber: "PO-230005...",
    materialName: "copier paper",
    materialCode: "Mat Codes",
    vendorName: "OfficeMax",
    orderedQty: 150,
    receivedQty: 100,
    variance: 50,
  },
  {
    poNumber: "PO-230006...",
    materialName: "copier paper",
    materialCode: "Mat Codes",
    vendorName: "OfficeMax",
    orderedQty: 100,
    receivedQty: 200,
    variance: 50,
  },
  {
    poNumber: "PO-230005...",
    materialName: "copier paper",
    materialCode: "Mat Codes",
    vendorName: "OfficeMax",
    orderedQty: 500,
    receivedQty: 300,
    variance: 50,
  },
];

// ── KPI Gauges ────────────────────────────────────────────────────────────────

export const poKpi = {
  onTimeDelivery: 92,
  orderCompleteness: 95,
};

// ── Category Spend (Current Month vs YTD) ────────────────────────────────────

export const categorySpend = [
  { name: "Food (อาหาร - 45%)", value: 45, currentMonth: 54000, ytd: 54000 },
  { name: "Beverage (เครื่องดื่ม - 30%)", value: 30, currentMonth: 34000, ytd: 15500 },
  { name: "Guest Supply (ของใช้แขก - 25%)", value: 25, currentMonth: 22000, ytd: 12000 },
];

// ── Top 5 Vendors by Spend ────────────────────────────────────────────────────

export const topVendorsBySpend = [
  { name: "Allied Foods", amount: 54000 },
  { name: "Central Hotel Supplies", amount: 24000 },
  { name: "Beverage Dist.", amount: 24000 },
  { name: "Prime Produce", amount: 17500 },
  { name: "Star Linen", amount: 15500 },
];

// ── Delivery Schedule ─────────────────────────────────────────────────────────

export const deliverySchedule = {
  today: 5,
  thisWeek: 20,
  nextWeek: 15,
};
