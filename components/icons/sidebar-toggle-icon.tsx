import { useId } from "react";
import { cn } from "@/lib/utils";

interface SidebarToggleIconProps {
  /** Reflects sidebar state — fills the left rail + nudges the chevron when open */
  readonly open?: boolean;
  readonly className?: string;
}

/**
 * Sidebar toggle icon in the Dia / Browser Company aesthetic: a soft, generously
 * rounded panel with a state-aware left rail. When open, the rail fills and the
 * chevron points inward (collapse); when closed it empties and points outward
 * (expand). Sized by the parent Button's `[&_svg]` rules — pass `className` to tune.
 */
export function SidebarToggleIcon({ open, className }: SidebarToggleIconProps) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="2" y="3" width="20" height="18" rx="4" />
        </clipPath>
      </defs>

      {/* Soft filled left rail (30% of panel width) — fades/slides in when open */}
      <rect
        x="2"
        y="3"
        width="6"
        height="18"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
        className={cn(
          "origin-left transition-all duration-300 ease-out",
          open ? "opacity-15" : "-translate-x-1 opacity-0",
        )}
      />

      {/* Panel outline */}
      <rect x="2" y="3" width="20" height="18" rx="4" />
      {/* Divider at 30% from the left */}
      <path d="M8 3v18" />

      {/* Chevron — points inward when open (collapse), outward when closed (expand) */}
      <path
        d={open ? "M15.5 9.5 13 12l2.5 2.5" : "M14 9.5 16.5 12 14 14.5"}
        className="transition-all duration-300 ease-out"
      />
    </svg>
  );
}
