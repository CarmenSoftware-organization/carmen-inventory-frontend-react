// components/form/summary-footer-bar.tsx
import { Fragment, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SummaryItemConfig {
  key: string;
  label: ReactNode;
  value: ReactNode;
  emphasis?: boolean; // larger text, used for the final "grand total" item
  valueClassName?: string; // override e.g. text-destructive for discount
  suffix?: ReactNode; // e.g. currency code next to grand total
}

interface SummaryBarProps {
  items: SummaryItemConfig[];
  className?: string;
}

export function SummaryBar({ items, className }: SummaryBarProps) {
  return (
    <div
      className={cn("flex items-center gap-4 tabular-nums", className)}
    >
      {items.map((item, i) => (
        <Fragment key={item.key}>
          {i > 0 && <span className="text-border">|</span>}
          <div
            className={[
              "flex items-center gap-1.5",
              item.emphasis ? "text-sm" : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span
              className="font-semibold"
            >
              {item.label}
            </span>
            <span className={item.valueClassName ?? "font-semibold"}>
              {item.value}
            </span>
            {item.suffix && (
              <span className="text-muted-foreground text-xs font-normal">
                {item.suffix}
              </span>
            )}
          </div>
        </Fragment>
      ))}
    </div>
  );
}

interface SummaryFooterBarProps {
  hasRecord: boolean;
  items: SummaryItemConfig[];
  children?: ReactNode; // e.g. action buttons rendered alongside the summary
  className?: string;
}

// Sticky footer wrapper: shows the summary only when hasRecord is true,
// aligns content depending on whether the summary is present.
export function SummaryFooterBar({
  hasRecord,
  items,
  children,
  className,
}: SummaryFooterBarProps) {
  return (
    <div
      className={[
        "bg-background sticky bottom-0 z-20 mt-auto flex flex-wrap items-center gap-3 border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-nowrap sm:gap-4",
        hasRecord ? "justify-between" : "justify-end",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {hasRecord && <SummaryBar items={items} />}
      {children}
    </div>
  );
}
