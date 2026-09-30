import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  draft: "before:bg-[var(--status-draft)]",
  submitted: "before:bg-[var(--status-in-progress)]",
  ready_to_release: "before:bg-[var(--status-approved)]",
  posted: "before:bg-[var(--status-completed)]",
  executed: "before:bg-[var(--status-completed)]",
  paid: "before:bg-[var(--status-completed)]",
  partially_paid: "before:bg-[var(--status-in-progress)]",
  unpaid: "before:bg-[var(--status-pending)]",
  matched: "before:bg-[var(--status-completed)]",
  variance: "before:bg-[var(--status-rejected)]",
  pending: "before:bg-[var(--status-in-progress)]",
  failed: "before:bg-[var(--status-rejected)]",
  voided: "before:bg-[var(--status-voided)]",
};

export function humanizeAp(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ApStatusBadge({ value }: { readonly value: string }) {
  return (
    <Badge
      variant="outline"
      size="xs"
      className={cn(
        "inline-flex items-center gap-1.5 capitalize",
        tone[value] ?? "",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone[value]?.replace("before:bg-", "bg-") ?? "bg-muted-foreground",
        )}
      />
      {humanizeAp(value)}
    </Badge>
  );
}

const moneyFormatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function Money({
  value,
  currency = "THB",
  className,
}: {
  readonly value: string;
  readonly currency?: string;
  readonly className?: string;
}) {
  const formatted = moneyFormatter.format(Number(value));
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {formatted} {currency}
    </span>
  );
}

export function LabelValue({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="text-xs font-medium sm:text-sm">{children}</div>
    </div>
  );
}
