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
        <p className="text-muted-foreground text-micro max-w-[16rem]">{desc}</p>
      )}
    </div>
  );
}
