import { createStatusConfig } from "./status-config";

export const PRICE_LIST_TEMPLATE_STATUS_OPTIONS = [
  { label: "Draft", value: "draft" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

export const PLT_STATUS_CONFIG = createStatusConfig([
  "draft",
  "active",
  "inactive",
] as const);
