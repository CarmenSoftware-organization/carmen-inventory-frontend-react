import {
  createStatusConfig,
  createStatusFilterOptions,
} from "@/constant/status-config";

export const INVENTORY_PERIOD_STATUS_CONFIG = createStatusConfig([
  "open",
  "closed",
  "locked",
] as const);

export const INVENTORY_PERIOD_STATUS_OPTIONS = createStatusFilterOptions(
  "status",
  INVENTORY_PERIOD_STATUS_CONFIG,
);
