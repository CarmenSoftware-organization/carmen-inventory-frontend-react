
import { formatName } from "@/lib/name";

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
