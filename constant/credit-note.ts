import { createStatusConfig } from "./status-config";

/** Badge variant + label for CN document-level status */
export const CN_STATUS_CONFIG = createStatusConfig([
  "draft",
  "in_progress",
  "completed",
  "cancelled",
  "voided",
] as const);

/** Badge color for CN type (quantity_return / amount_discount) */
export const CN_TYPE_CONFIG = createStatusConfig(
  ["quantity_return", "amount_discount"] as const,
  {
    quantity_return: { label: "QTY RETURN" },
    amount_discount: { label: "AMT DISCOUNT" },
  },
);
