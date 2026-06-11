// ── PR Pipeline Summary ───────────────────────────────────────────────────────

export type PrPipelineKey =
  | "requests"
  | "in_process"
  | "approved"
  | "po_generated"
  | "received";

export interface PrPipelineItem {
  key: PrPipelineKey;
  label: string;
  count: number;
}

export const prPipelineSummary: PrPipelineItem[] = [
  { key: "requests", label: "REQUESTS", count: 12 },
  { key: "in_process", label: "IN PROCESS", count: 18 },
  { key: "approved", label: "APPROVED", count: 45 },
  { key: "po_generated", label: "PO GENERATED", count: 30 },
  { key: "received", label: "RECEIVED", count: 85 },
];

// ── Sent Back PRs ─────────────────────────────────────────────────────────────

export interface SentBackPr {
  prNumber: string;
  itemName: string;
  dateSent: string;
  sender: string;
  reason: string;
}

export const sentBackPrs: SentBackPr[] = [
  {
    prNumber: "PR-2503001",
    itemName: "Singha Beer 320ml (Can)",
    dateSent: "Mar 12, 2026",
    sender: "Chef Somchai",
    reason: "Reason neaver packs b...",
  },
  {
    prNumber: "PR-2503005",
    itemName: "Dishwashing Liquid",
    dateSent: "Mar 12, 2026",
    sender: "Chef Somchai",
    reason: "Reason heaver bequire...",
  },
];

// ── Rejected PRs & Item Rejects ───────────────────────────────────────────────

export interface RejectedPr {
  prNumberItemId: string;
  materialName: string;
  requester: string;
  rejectedBy: string;
  reason: string;
}

export const rejectedPrs: RejectedPr[] = [
  {
    prNumberItemId: "PR-2503001",
    materialName: "Singha Beer 320ml (Can)",
    requester: "Chef Somchai",
    rejectedBy: "Chef Somchai",
    reason: "Reason onsonz rejected...",
  },
  {
    prNumberItemId: "PR-2503005",
    materialName: "Dishwashing Liquid",
    requester: "Chef Somchai",
    rejectedBy: "Chef Somchai",
    reason: "Reason onnonz rejectol...",
  },
];

// ── Spending by Category ──────────────────────────────────────────────────────

export const personalSpending = [
  { name: "Food (อาหาร - 45%)", value: 45 },
  { name: "Beverage (เครื่องดื่ม - 30%)", value: 30 },
  { name: "Guest Supply (ของใช้แขก - 25%)", value: 25 },
];

export const departmentSpending = [
  { category: "Food\n(อาหาร)", amount: 54000 },
  { category: "Beverage\n(เครื่องดื่ม)", amount: 24000 },
  { category: "Guest Supply\n(ของใช้แขก)", amount: 15500 },
];

// ── Awaiting Approval Queue ───────────────────────────────────────────────────

export type AwaitingStatus = "awaiting_hod" | "awaiting_po";

export interface AwaitingPr {
  prNumber: string;
  itemName: string;
  requester: string;
  dept: string;
  dateRequested: string;
  status: AwaitingStatus;
}

export const awaitingApprovalQueue: AwaitingPr[] = [
  {
    prNumber: "PR-2503015",
    itemName: "Singha Beer 320ml (Can)",
    requester: "Chef Somchai",
    dept: "Department Center",
    dateRequested: "Mar 12, 2026 10:30 AM",
    status: "awaiting_hod",
  },
  {
    prNumber: "PR-2503020",
    itemName: "Dishwashing Liquid",
    requester: "Chef Somchai",
    dept: "F&B Dept",
    dateRequested: "Mar 12, 2026 10:30 AM",
    status: "awaiting_po",
  },
  {
    prNumber: "PR-2503025",
    itemName: "Singha Beer 320ml (Can)",
    requester: "Chef Somchai",
    dept: "F&B Dept",
    dateRequested: "Mar 12, 2026 10:30 AM",
    status: "awaiting_po",
  },
];
