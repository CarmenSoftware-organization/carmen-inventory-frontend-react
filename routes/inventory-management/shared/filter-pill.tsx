
import { cn } from "@/lib/utils";

interface FilterPillProps {
  readonly active: boolean;
  readonly onClick: () => void;
  readonly label: string;
  readonly count: number;
  readonly tone?: "primary" | "warning" | "success";
}

// FLAT (DESIGN.md "avoid neon"): the active pill carries ONE signal — a
// colored border — over a neutral box and text. No tinted fill, no colored
// glow halo (the old `shadow-[0_0_0_3px_color-mix(...)]` read as neon).
const ACTIVE_TONE_MAP: Record<string, string> = {
  primary: "border-primary text-foreground",
  warning: "border-warning text-foreground",
  success: "border-success text-foreground",
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
        "border-border/40 bg-card hover:bg-card inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.6875rem] font-semibold tracking-wide transition-all",
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
