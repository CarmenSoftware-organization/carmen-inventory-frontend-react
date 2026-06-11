
import { cn } from "@/lib/utils";

interface FilterPillProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly label: string;
  readonly count: number;
  readonly tone?: "primary" | "warning" | "success";
}

const ACTIVE_TONE_MAP: Record<string, string> = {
  primary:
    "border-primary bg-primary/10 text-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary),transparent_88%)]",
  warning:
    "border-warning bg-warning/10 text-warning-foreground shadow-[0_0_0_3px_color-mix(in_oklch,var(--warning),transparent_88%)]",
  success:
    "border-success bg-success/10 text-success shadow-[0_0_0_3px_color-mix(in_oklch,var(--success),transparent_88%)]",
};

export function FilterPill({
  active,
  onClick,
  label,
  count,
  tone = "primary",
}: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border-border/40 bg-card/40 hover:bg-card/80 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide backdrop-blur-sm transition-all",
        active && ACTIVE_TONE_MAP[tone],
      )}
    >
      <span>{label}</span>
      <span className="bg-muted/60 text-foreground/70 rounded-full px-1.5 text-[0.5625rem] font-bold tabular-nums">
        {count}
      </span>
    </button>
  );
}
