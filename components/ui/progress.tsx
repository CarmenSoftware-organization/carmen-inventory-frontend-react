
import * as React from "react";
import { Progress as ProgressPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

type ProgressTone =
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "destructive"
  | "muted";

type ProgressVariant = ProgressTone | "auto";

const TONE_CLASSES: Record<ProgressTone, { track: string; indicator: string }> =
  {
    primary: { track: "bg-primary/20", indicator: "bg-primary" },
    success: { track: "bg-success/20", indicator: "bg-success" },
    warning: { track: "bg-warning/20", indicator: "bg-warning" },
    info: { track: "bg-info/20", indicator: "bg-info" },
    destructive: { track: "bg-destructive/20", indicator: "bg-destructive" },
    muted: { track: "bg-muted", indicator: "bg-muted-foreground/40" },
  };

/**
 * เลือก tone อัตโนมัติตามค่า value (0–100)
 * 0 → muted, (0,50) → destructive, [50,100) → warning, 100 → success
 */
const pickAutoTone = (value: number): ProgressTone => {
  if (value <= 0) return "muted";
  if (value >= 100) return "success";
  if (value < 50) return "destructive";
  return "warning";
};

interface ProgressProps extends React.ComponentProps<
  typeof ProgressPrimitive.Root
> {
  readonly variant?: ProgressVariant;
  readonly indicatorClassName?: string;
}

function Progress({
  className,
  value,
  variant = "primary",
  indicatorClassName,
  ...props
}: Readonly<ProgressProps>) {
  const resolved: ProgressTone =
    variant === "auto" ? pickAutoTone(value ?? 0) : variant;
  const tone = TONE_CLASSES[resolved];
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full",
        tone.track,
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "h-full w-full flex-1 transition-all",
          tone.indicator,
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
