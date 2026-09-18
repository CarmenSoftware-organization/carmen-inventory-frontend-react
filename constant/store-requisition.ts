import {
  createStatusConfig,
  createStatusFilterOptions,
  STATUS_DOT_CHIP,
  type StatusConfigEntry,
} from "./status-config";

export const SR_LIST_PATH = "/store-operation/store-requisition";

export const SR_STATUS_CONFIG = createStatusConfig([
  "draft",
  "in_progress",
  "completed",
  "cancelled",
  "voided",
] as const);

export const SR_ITEM_STATUS_CONFIG: Record<string, StatusConfigEntry> = {
  pending: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-pending)]`,
    label: "Pending",
  },
  submit: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-submitted)]`,
    label: "Submit",
  },
  submitted: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-submitted)]`,
    label: "Submitted",
  },
  approve: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-approved)]`,
    label: "Approve",
  },
  approved: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-approved)]`,
    label: "Approved",
  },
  reject: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-rejected)]`,
    label: "Reject",
  },
  rejected: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-rejected)]`,
    label: "Rejected",
  },
  review: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-review)]`,
    label: "Review",
  },
  issue: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-completed)]`,
    label: "Issue",
  },
  issued: {
    className: `${STATUS_DOT_CHIP} before:bg-[var(--status-completed)]`,
    label: "Issued",
  },
};

// key ตรงกับ `action` ที่ backend ส่ง (bare form) เพื่อ map เป็น dot-chip ใน
// STATUS_CLASSNAMES อัตโนมัติ — เหมือน PR_WORKFLOW_ACTION_CONFIG
export const SR_WORKFLOW_ACTION_CONFIG = createStatusConfig([
  "submitted",
  "approved",
  "rejected",
  "sent_back",
  "reviewed",
  "completed",
] as const);

export const STORE_REQUISITION_STATUS_OPTIONS = createStatusFilterOptions(
  "doc_status",
  SR_STATUS_CONFIG,
);
