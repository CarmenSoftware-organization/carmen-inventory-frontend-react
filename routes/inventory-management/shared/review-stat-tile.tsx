import type { ComponentType } from "react";
import { cn } from "@/lib/utils";

export type ReviewStatTone = "primary" | "success" | "warning" | "destructive";

const STAT_TONE: Record<
  ReviewStatTone,
  { iconBg: string; iconFg: string; valueText: string; ring: string }
> = {
  primary: {
    iconBg: "bg-primary/15",
    iconFg: "text-primary",
    valueText: "text-primary",
    ring: "border-border/60",
  },
  success: {
    iconBg: "bg-success/15",
    iconFg: "text-success",
    valueText: "text-success",
    ring: "border-border/60",
  },
  warning: {
    iconBg: "bg-warning/15",
    iconFg: "text-warning-foreground",
    valueText: "text-warning-foreground",
    ring: "border-border/60",
  },
  destructive: {
    iconBg: "bg-destructive/15",
    iconFg: "text-destructive",
    valueText: "text-destructive",
    ring: "border-border/60",
  },
};

interface ReviewStatTileProps {
  readonly icon: ComponentType<{ className?: string }>;
  readonly tone: ReviewStatTone;
  readonly label: string;
  readonly value: number;
  readonly desc: string;
}

export function ReviewStatTile({
  icon: Icon,
  tone,
  label,
  value,
  desc,
}: ReviewStatTileProps) {
  const tones = STAT_TONE[tone];
  return (
    <div
      className={cn("bg-card space-y-1.5 rounded-xl border p-3", tones.ring)}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-full",
            tones.iconBg,
            tones.iconFg,
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <span className="text-foreground text-sm font-semibold tracking-tight">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "text-2xl leading-none font-semibold tracking-tight tabular-nums",
          tones.valueText,
        )}
      >
        {value}
      </div>
      <p className="text-muted-foreground text-[0.6875rem] leading-snug">
        {desc}
      </p>
    </div>
  );
}
