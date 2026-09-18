import { createStatusConfig, createStatusFilterOptions } from "./status-config";

export const GRN_STATUS_CONFIG = createStatusConfig([
  "draft",
  "saved",
  "committed",
  "voided",
] as const);

export const GRN_STATUS_OPTIONS = createStatusFilterOptions(
  "doc_status",
  GRN_STATUS_CONFIG,
);

export const GRN_FORM_STATUS_CONFIG = createStatusConfig([
  "draft",
  "saved",
  "committed",
  "voided",
] as const);

export const GRN_TYPE_CONFIG = createStatusConfig(
  ["grn_purchase_order", "grn_manual"] as const,
  {
    grn_purchase_order: { label: "PO" },
    grn_manual: { label: "MN" },
  },
);

export const GRN_DOC_TYPE_KEY: Record<string, string> = {
  purchase_order: "grn_purchase_order",
  manual: "grn_manual",
};

export const GRN_PO_STATUS_CONFIG = createStatusConfig([
  "open",
  "partial",
] as const);
