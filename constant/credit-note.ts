import {
  createStatusConfig,
  createStatusFilterOptions,
} from "./status-config";

/** Badge variant + label for CN document-level status */
export const CN_STATUS_CONFIG = createStatusConfig([
  "draft",
  "in_progress",
  "completed",
  "cancelled",
  "voided",
] as const);

/** ตัวเลือก filter สถานะ CN ใน list sheet — คอลัมน์จริงใน DB คือ doc_status */
export const CN_STATUS_OPTIONS = createStatusFilterOptions(
  "doc_status",
  CN_STATUS_CONFIG,
);

/** Badge color for CN type (quantity_return / amount_discount) */
export const CN_TYPE_CONFIG = createStatusConfig(
  ["quantity_return", "amount_discount"] as const,
  {
    quantity_return: { label: "QTY RETURN" },
    amount_discount: { label: "AMT DISCOUNT" },
  },
);

/** ตัวเลือก filter ประเภท CN ใน list sheet (ค่าเป็น clause เต็มต่อตัว) */
export const CN_TYPE_OPTIONS = createStatusFilterOptions(
  "credit_note_type",
  CN_TYPE_CONFIG,
);
