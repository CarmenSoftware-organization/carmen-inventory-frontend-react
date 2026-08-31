import type { DotTone } from "@/components/ui/status-dot-badge";
import type { WastageStatus } from "@/types/wastage-reporting";

/** tone ของ StatusDotBadge ต่อสถานะความเสี่ยงของ lot */
export const WASTAGE_STATUS_TONE: Record<WastageStatus, DotTone> = {
  expired: "destructive",
  expiring: "warning",
};

/** ตัวเลือก filter สถานะ — label เป็น literal string ตาม convention StatusFilter */
export const WASTAGE_STATUS_OPTIONS = [
  { label: "Expired", value: "status|string:expired" },
  { label: "Expiring", value: "status|string:expiring" },
];
