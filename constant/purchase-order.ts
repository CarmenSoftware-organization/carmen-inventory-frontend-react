import { createStatusConfig, createStatusFilterOptions } from "./status-config";

export const PO_STATUS_CONFIG = createStatusConfig([
  "draft",
  "in_progress",
  "approved",
  "sent_or_print",
  "partial",
  "closed",
  "completed",
] as const);

export const PO_TYPE_CONFIG = createStatusConfig(
  ["purchase_request", "manual", "pricelist"] as const,
  {
    purchase_request: { label: "Purchase Request" },
    manual: { label: "Manual" },
    pricelist: { label: "Price List" },
  },
);

export const PURCHASE_ORDER_STATUS_OPTIONS = createStatusFilterOptions(
  "po_status",
  PO_STATUS_CONFIG,
);

export const PURCHASE_ORDER_TYPE_OPTIONS = createStatusFilterOptions(
  "po_type",
  PO_TYPE_CONFIG,
);

export const PO_ITEM_STATUS_CONFIG = createStatusConfig([
  "pending",
  "approved",
  "rejected",
  "review",
] as const);

export function normalizePoItemStatus(raw: string): string {
  if (raw === "approve") return "approved";
  if (raw === "reject") return "rejected";
  return raw;
}

export const computePoAction = (
  statuses: string[],
): "none" | "review" | "rejected" | "approved" => {
  if (statuses.length === 0) return "none";
  if (statuses.includes("review")) return "review";
  if (statuses.includes("pending") || statuses.includes("")) return "none";
  if (statuses.includes("approved")) return "approved";
  if (statuses.every((s) => s === "rejected")) return "rejected";
  return "none";
};
