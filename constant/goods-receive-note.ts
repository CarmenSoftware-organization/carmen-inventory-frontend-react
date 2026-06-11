import { createStatusConfig } from "./status-config";

/** GRN document status (table/card view) */
export const GRN_STATUS_CONFIG = createStatusConfig([
  "draft",
  "saved",
  "committed",
  "voided",
] as const);

/** GRN form status (save/committed flow) */
export const GRN_FORM_STATUS_CONFIG = createStatusConfig([
  "draft",
  "saved",
  "committed",
  "voided",
] as const);

/** Badge color for GRN doc_type (purchase_order / manual) */
export const GRN_TYPE_CONFIG = createStatusConfig(
  ["grn_purchase_order", "grn_manual"] as const,
  {
    grn_purchase_order: { label: "PO" },
    grn_manual: { label: "MN" },
  },
);

/** Maps raw GRN doc_type values to GRN_TYPE_CONFIG keys */
export const GRN_DOC_TYPE_KEY: Record<string, string> = {
  purchase_order: "grn_purchase_order",
  manual: "grn_manual",
};

/** GRN status on PO selection dialogs */
export const GRN_PO_STATUS_CONFIG = createStatusConfig([
  "open",
  "partial",
] as const);
