
import { formatName } from "@/lib/name";

/* Re-export shared admin primitives so existing imports from this file
   keep working without churn. */
export {
  StatTile,
  SectionCard,
  EmptyState,
  FilterChip,
  type Tone,
} from "../../shared/admin-ui";

/* ------------------------------------------------------------------ */
/* UserAvatar — user-specific (initials + hashed gradient)             */
/* ------------------------------------------------------------------ */

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getAvatarGradient(seed: string): string {
  const hue = hashString(seed || "_") % 360;
  return `linear-gradient(135deg, hsl(${hue} 70% 58%) 0%, hsl(${(hue + 55) % 360} 65% 48%) 100%)`;
}

interface UserAvatarProps {
  readonly first: string;
  readonly last: string;
  readonly seed: string;
}

export function UserAvatar({ first, last, seed }: UserAvatarProps) {
  return (
    <div
      className="ring-background flex size-16 shrink-0 items-center justify-center rounded-full text-lg font-semibold tracking-wide text-white ring-4"
      style={{ background: getAvatarGradient(seed) }}
      aria-hidden="true"
    >
      {formatName(first, last)}
    </div>
  );
}
