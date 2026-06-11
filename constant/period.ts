import { createStatusConfig, createStatusFilterOptions } from "@/constant/status-config";

export const PERIOD_STATUS_CONFIG = createStatusConfig([
  "open",
  "closed",
  "locked",
] as const);

export const PERIOD_STATUS_OPTIONS = createStatusFilterOptions(
  "status",
  PERIOD_STATUS_CONFIG,
);
