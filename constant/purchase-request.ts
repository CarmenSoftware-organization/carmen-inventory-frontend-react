import {
  createStatusConfig,
  createStatusFilterOptions,
} from "./status-config";

/** Badge className + label for PR document-level status */
export const PR_STATUS_CONFIG = createStatusConfig([
  "draft",
  "submitted",
  "in_progress",
  "approved",
  "rejected",
  "completed",
  "cancelled",
  "voided",
] as const);

/** Badge className + label for PR item-level status */
export const PR_ITEM_STATUS_CONFIG = createStatusConfig([
  "pending",
  "approved",
  "rejected",
  "review",
] as const);

/** Badge className + label for workflow history actions */
export const PR_WORKFLOW_ACTION_CONFIG = createStatusConfig([
  "submitted",
  "approved",
  "rejected",
  "sent_back",
  "reviewed",
] as const);

export const PURCHASE_REQUEST_STATUS_OPTIONS = createStatusFilterOptions(
  "pr_status",
  PR_STATUS_CONFIG,
);
