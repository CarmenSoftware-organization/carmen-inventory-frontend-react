
import type { ReactNode } from "react";
import { formatName } from "@/lib/name";
import { cn } from "@/lib/utils";

/* Re-export shared admin primitives so existing imports from this file
   keep working without churn. */
export {
  StatTile,
  SectionCard,
  EmptyState,
  FilterChip,
  type Tone,
} from "../shared/admin-ui";

/* ------------------------------------------------------------------ */
/* AssignSection — 2-column "settings" row (mirrors business-setting)  */
/* left = title + description (+ count / filter action); right = body   */
/* ------------------------------------------------------------------ */

export function AssignSection({
  title,
  description,
  count,
  action,
  first,
  children,
}: {
  readonly title: string;
  readonly description?: string;
  readonly count?: number;
  readonly action?: ReactNode;
  readonly first?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "grid gap-x-10 gap-y-3 md:grid-cols-3",
        !first && "border-border/70 mt-8 border-t pt-8",
      )}
    >
      <div className="md:col-span-1">
        <div className="flex items-baseline gap-2">
          <h2 className="text-foreground text-base font-semibold tracking-tight">
            {title}
          </h2>
          {count !== undefined && (
            <span className="text-muted-foreground text-xs font-semibold tabular-nums">
              {count}
            </span>
          )}
        </div>
        {description && (
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            {description}
          </p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
      <div className="min-w-0 md:col-span-2">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* UserAvatar — initials on a flat neutral surface (identity, not neon) */
/* ------------------------------------------------------------------ */

interface UserAvatarProps {
  readonly first: string;
  readonly last: string;
}

export function UserAvatar({ first, last }: UserAvatarProps) {
  return (
    <div
      className="border-border/60 bg-muted text-foreground flex size-16 shrink-0 items-center justify-center rounded-full border text-lg font-semibold tracking-wide"
      aria-hidden="true"
    >
      {formatName(first, last)}
    </div>
  );
}
