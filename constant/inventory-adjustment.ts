import { PackageMinus, PackagePlus, type LucideIcon } from "lucide-react";
import { createStatusConfig } from "./status-config";

export const IA_STATUS_CONFIG = createStatusConfig([
  "draft",
  "in_progress",
  "completed",
  "voided",
] as const);

// Type badge: neutral chip — สีถูกพาโดย "ไอคอน" (stock-in/out มี icon ทิศอยู่แล้ว)
// ไม่ใช้ dot เหมือน status badge
const IA_TYPE_CHIP = "bg-muted text-foreground border-transparent gap-1.5 px-2";

export const IA_TYPE_CONFIG = createStatusConfig(
  ["stock-in", "stock-out"] as const,
  {
    "stock-in": { label: "STOCK IN", className: IA_TYPE_CHIP },
    "stock-out": { label: "STOCK OUT", className: IA_TYPE_CHIP },
  },
);

export const IA_TYPE_ICON_COLOR: Record<"stock-in" | "stock-out", string> = {
  "stock-in": "text-success",
  "stock-out": "text-destructive",
};

export const IA_TYPE_ICON: Record<"stock-in" | "stock-out", LucideIcon> = {
  "stock-in": PackagePlus,
  "stock-out": PackageMinus,
};
