import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* SectionCard — bordered card with icon header + count + optional     */
/* action slot                                                         */
/* ------------------------------------------------------------------ */

interface SectionCardProps {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly title: string;
  readonly count?: number;
  readonly action?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function SectionCard({
  icon: Icon,
  title,
  count,
  children,
  action,
  className,
}: SectionCardProps) {
  return (
    <section
      className={cn(
        "border-border/60 bg-card overflow-hidden rounded-xl border",
        className,
      )}
    >
      <header className="border-border/60 flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Icon className="text-muted-foreground size-3.5" aria-hidden="true" />
          <h2 className="text-foreground text-sm font-semibold">{title}</h2>
          {count !== undefined && (
            <span className="text-muted-foreground text-xs font-semibold">
              · {count}
            </span>
          )}
        </div>
        {action}
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* EmptyState — circle icon + title + optional description             */
/* ------------------------------------------------------------------ */

interface EmptyStateProps {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly title: string;
  readonly desc?: string;
}

export function EmptyState({ icon: Icon, title, desc }: EmptyStateProps) {
  return (
    <div className="border-border/40 bg-muted/20 flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed py-8 text-center">
      <div className="bg-muted text-muted-foreground/70 flex size-9 items-center justify-center rounded-full">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <p className="text-foreground text-xs font-semibold">{title}</p>
      {desc && (
        <p className="text-muted-foreground max-w-[16rem] text-[0.6875rem]">
          {desc}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FilterChip — pill toggle with count + optional accent dot           */
/* ------------------------------------------------------------------ */

interface FilterChipProps {
  readonly label: string;
  readonly count: number;
  readonly active: boolean;
  readonly onClick: () => void;
  readonly accentClass?: string;
}

export function FilterChip({
  label,
  count,
  active,
  onClick,
  accentClass,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.6875rem] font-semibold transition-colors",
        active
          ? "border-primary/40 bg-primary/5 text-foreground"
          : "border-border/60 bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground",
      )}
    >
      {accentClass && (
        <span
          className={cn("size-1.5 rounded-full", accentClass)}
          aria-hidden="true"
        />
      )}
      <span>{label}</span>
      <span className="text-muted-foreground/80 tabular-nums">{count}</span>
    </button>
  );
}
