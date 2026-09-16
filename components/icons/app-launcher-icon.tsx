import { cn } from "@/lib/utils";

interface AppLauncherIconProps {
  readonly className?: string;
}

const DOTS = [
  [5, 5],
  [12, 5],
  [19, 5],
  [5, 12],
  [12, 12],
  [19, 12],
  [5, 19],
  [12, 19],
  [19, 19],
] as const;

export function AppLauncherIcon({ className }: AppLauncherIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      {DOTS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2" />
      ))}
    </svg>
  );
}
