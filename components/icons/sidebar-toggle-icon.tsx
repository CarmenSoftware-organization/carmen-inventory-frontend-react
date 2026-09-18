import { useId } from "react";
import { cn } from "@/lib/utils";

interface SidebarToggleIconProps {
  readonly open?: boolean;
  readonly className?: string;
}

export function SidebarToggleIcon({ open, className }: SidebarToggleIconProps) {
  const clipId = useId();

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="2" y="3" width="20" height="18" rx="3.5" />
        </clipPath>
      </defs>

      {/* Filled left rail (30% of panel width) — quiet opacity-only fade when open */}
      <rect
        x="2"
        y="3"
        width="6"
        height="18"
        fill="currentColor"
        clipPath={`url(#${clipId})`}
        className={cn(
          "transition-opacity duration-200 ease-out",
          open ? "opacity-15" : "opacity-0",
        )}
      />

      {/* Panel outline */}
      <rect x="2" y="3" width="20" height="18" rx="3.5" />
      {/* Divider at 30% from the left */}
      <path d="M8 3v18" />

      {/* Chevron — points inward when open (collapse), outward when closed (expand) */}
      <path
        d={open ? "M15.5 9.5 13 12l2.5 2.5" : "M14 9.5 16.5 12 14 14.5"}
        className="transition-all duration-200 ease-out"
      />
    </svg>
  );
}
