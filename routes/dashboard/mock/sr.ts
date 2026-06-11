// ── SR Pipeline ───────────────────────────────────────────────────────────────

export const srPipeline = [
  { key: "requested", label: "REQUESTED", count: 25, sub: "Newly Submitted" },
  { key: "in_process", label: "IN PROCESS", count: 35, sub: "Fulfilling/Processing" },
  { key: "approved", label: "APPROVED", count: 50, sub: "Ready for Issue/Receiving" },
  { key: "issued", label: "ISSUED", count: 60, sub: "Material Handed Over" },
] as const;

// ── Sent Back SRs ─────────────────────────────────────────────────────────────

export interface SentBackSr {
  srNumber: string;
  requester: string;
  dateSent: string;
  sender: string;
  reason: string;
}

export const sentBackSrs: SentBackSr[] = [
  {
    srNumber: "SR-2510001",
    requester: "Alex Wong, SR",
    dateSent: "Mar 12, 2026",
    sender: "Invalid Account Code",
    reason: "Invalid Account Code",
  },
  {
    srNumber: "SR-2510015",
    requester: "Alex Wong, SR",
    dateSent: "Mar 12, 2026",
    sender: "Wrong Dept",
    reason: "Missing Specifics",
  },
  {
    srNumber: "SR-2510013",
    requester: "Alex Wong, SR",
    dateSent: "Mar 12, 2026",
    sender: "Wrong Dept",
    reason: "Wrong Dept",
  },
];

// ── Reject List ───────────────────────────────────────────────────────────────

export interface SrRejectItem {
  srNumber?: string;
  materialName: string;
  requester: string;
  rejectedBy: string;
  reason: string;
}

export const srRejectList: SrRejectItem[] = [
  {
    srNumber: "SR-2510005",
    materialName: "Mixer - Description: Tive ...",
    requester: "Alex Wong, ID",
    rejectedBy: "AssomHurison",
    reason: "Duplicate Request",
  },
  {
    materialName: "Oven (Description: 120o, ...",
    requester: "Alex Wong, ID",
    rejectedBy: "Ramor Durison",
    reason: "Over Par",
  },
  {
    materialName: "Oven (Description: 1805, ...",
    requester: "Alex Wong, ID",
    rejectedBy: "AssomHarison",
    reason: "Over Consumption Limit",
  },
  {
    srNumber: "SR-2510007",
    materialName: "Mixer (Description: Tool, ...",
    requester: "Alex Wong, ID",
    rejectedBy: "Ramor Nurison",
    reason: "Over Par",
  },
];

// ── SRs Awaiting Approval ─────────────────────────────────────────────────────

export type AwaitingTab = "today" | "week" | "month";

export interface AwaitingSr {
  prNo: string;
  description: string;
  amount: number;
  stage: string;
}

export const awaitingSrsToday: AwaitingSr[] = [
  { prNo: "PR00456", description: "Office Supplies", amount: 1200, stage: "HOD Approved" },
  { prNo: "PR00458", description: "Raw Ingredients", amount: 8500, stage: "Procurement Review" },
  { prNo: "PR00461", description: "Guest Amenities", amount: 2100, stage: "Final Approval" },
];

export const awaitingSrsWeek: AwaitingSr[] = [
  { prNo: "PR00440", description: "Cleaning Supplies", amount: 3400, stage: "HOD Approved" },
  { prNo: "PR00445", description: "Kitchen Equipment", amount: 15200, stage: "Procurement Review" },
  { prNo: "PR00450", description: "Beverage Stock", amount: 6700, stage: "HOD Approved" },
  { prNo: "PR00453", description: "Laundry Items", amount: 920, stage: "Final Approval" },
];

export const awaitingSrsMonth: AwaitingSr[] = [
  { prNo: "PR00410", description: "Food & Beverage", amount: 42000, stage: "HOD Approved" },
  { prNo: "PR00420", description: "Housekeeping Items", amount: 8900, stage: "Procurement Review" },
  { prNo: "PR00430", description: "Maintenance Parts", amount: 5600, stage: "Final Approval" },
];

// ── My Consumption (Personal) ─────────────────────────────────────────────────

export const myConsumption = {
  total: 18000,
  breakdown: [
    { name: "Food", value: 45, amount: 18000 },
    { name: "Beverage", value: 30, amount: 15000 },
    { name: "Guest Supply", value: 25, amount: 8000 },
  ],
};

// ── Dept Consumption ──────────────────────────────────────────────────────────

export const deptConsumption = [
  { category: "Food", amount: 18000 },
  { category: "Beverage", amount: 18000 },
  { category: "Guest Supply", amount: 12000 },
];

// ── SR Awaiting Received ──────────────────────────────────────────────────────

export interface SrAwaitingReceived {
  prNo: string;
  description: string;
  amount: string;
}

export const srAwaitingReceived: SrAwaitingReceived[] = [
  { prNo: "PR-2233001", description: "Fresh Vegetables", amount: "100 kg" },
  { prNo: "PR-2233001", description: "Fresh Vegetables", amount: "100 kg" },
  { prNo: "PR-2233001", description: "Fresh Vegetables", amount: "100 kg" },
  { prNo: "PR-2233004", description: "Fresh Vegetables", amount: "100 kg" },
  { prNo: "PR-2253001", description: "Fresh Vegetables", amount: "100 kg" },
  { prNo: "PR-7233001", description: "Fresh Vegetables", amount: "100 kg" },
];

// ── My Templates ──────────────────────────────────────────────────────────────

export const myTemplates = [
  "Weekly Kitchen Requisition",
  "Pool Requisition Template",
  "Housekeeping Amenities",
  "Weekly Kitchen Template",
];
