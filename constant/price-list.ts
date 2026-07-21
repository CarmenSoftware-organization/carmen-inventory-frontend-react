import { createStatusConfig } from "./status-config";

export const PRICE_LIST_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export const PL_STATUS_CONFIG = createStatusConfig([
  "draft",
  "submitted",
  "active",
  "inactive",
] as const);
