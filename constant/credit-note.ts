import { createStatusConfig, createStatusFilterOptions } from "./status-config";

export const CN_STATUS_CONFIG = createStatusConfig([
  "draft",
  "in_progress",
  "completed",
  "cancelled",
  "voided",
] as const);

export const CN_STATUS_OPTIONS = createStatusFilterOptions(
  "doc_status",
  CN_STATUS_CONFIG,
);

export const CN_TYPE_CONFIG = createStatusConfig(
  ["quantity_return", "amount_discount"] as const,
  {
    quantity_return: { label: "QTY RETURN" },
    amount_discount: { label: "AMT DISCOUNT" },
  },
);

export const CN_TYPE_OPTIONS = createStatusFilterOptions(
  "credit_note_type",
  CN_TYPE_CONFIG,
);
