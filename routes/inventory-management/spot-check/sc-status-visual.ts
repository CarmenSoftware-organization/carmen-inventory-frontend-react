import { Gem, Hash, Shuffle } from "lucide-react";
import type { BadgeProps } from "@/components/ui/badge";
import type { SpotCheckMethod, SpotCheckStatus } from "@/types/spot-check";

export interface StatusVisual {
  variant: BadgeProps["variant"];
  dotClass: string;
  pulse: boolean;
  /** className เสริมให้ Badge — สำหรับ override text color เป็นต้น */
  className?: string;
}

export interface MethodVisual {
  variant: BadgeProps["variant"];
  icon: React.ComponentType<{ className?: string }>;
}

const DESTRUCTIVE: StatusVisual = {
  variant: "destructive-light",
  dotClass: "bg-destructive",
  pulse: false,
  // bg-destructive/10 อ่อน + text-destructive-foreground (ขาว) จะกลืนกัน
  // override เป็น text-destructive ให้ตัวอักษรเด่นชัด
  className: "text-destructive",
};

// FLAT (DESIGN.md "avoid neon"): no pulse — the pulsing dot read as a glowing
// "live" signal. The colored dot alone is the single status signal.
export const STATUS_VISUAL: Record<SpotCheckStatus, StatusVisual> = {
  pending: { variant: "info-light", dotClass: "bg-info", pulse: false },
  in_progress: {
    variant: "warning-light",
    dotClass: "bg-warning",
    pulse: false,
  },
  completed: {
    variant: "success-light",
    dotClass: "bg-success",
    pulse: false,
  },
  void: DESTRUCTIVE,
  voided: DESTRUCTIVE,
  cancelled: DESTRUCTIVE,
};

export const METHOD_VISUAL: Record<SpotCheckMethod, MethodVisual> = {
  random: { variant: "info-light", icon: Shuffle },
  high_value: { variant: "warning-light", icon: Gem },
  manual: { variant: "primary-light", icon: Hash },
};
