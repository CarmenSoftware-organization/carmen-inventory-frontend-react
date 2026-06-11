import {
  createStatusConfig,
  createStatusFilterOptions,
} from "./status-config";

/** Badge variant + label for WR document-level status */
export const WR_STATUS_CONFIG = createStatusConfig([
  "pending",
  "approved",
  "rejected",
] as const);

export const WASTAGE_REPORT_STATUS_OPTIONS = createStatusFilterOptions(
  "status",
  WR_STATUS_CONFIG,
);
