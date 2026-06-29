
import { cn } from "@/lib/utils";

interface CardProps {
  readonly label?: string;
  readonly action?: React.ReactNode;
  readonly children: React.ReactNode;
  readonly className?: string;
}

export function Card({ label, action, children, className }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-md border bg-card p-3 md:p-4",
        className,
      )}
    >
      {(label || action) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          {label && (
            <h2 className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </h2>
          )}
          {action && <div className="flex items-center gap-1.5">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function CardSubLabel({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "text-[0.625rem] font-bold uppercase tracking-[0.12em] text-foreground/80",
        className,
      )}
    >
      {children}
    </div>
  );
}
