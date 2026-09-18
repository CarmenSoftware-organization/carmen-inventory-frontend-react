import type { DotTone } from "@/components/ui/status-dot-badge";
import type { WastageStatus } from "@/types/wastage-reporting";

export const WASTAGE_STATUS_TONE: Record<WastageStatus, DotTone> = {
  expired: "destructive",
  expiring: "warning",
};

export const WASTAGE_STATUS_OPTIONS = [
  { label: "Expired", value: "status|string:expired" },
  { label: "Expiring", value: "status|string:expiring" },
];
