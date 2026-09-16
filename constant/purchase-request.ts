import { createStatusConfig, createStatusFilterOptions } from "./status-config";

export const PR_STATUS_CONFIG = createStatusConfig([
  "draft",
  "in_progress",
  "approved",
  "completed",
  "voided",
] as const);

export const PR_ITEM_STATUS_CONFIG = createStatusConfig([
  "pending",
  "approved",
  "rejected",
  "review",
] as const);

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
