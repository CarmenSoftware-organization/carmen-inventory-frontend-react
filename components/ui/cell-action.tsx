import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CellActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly children: React.ReactNode;
}

export const CellAction = forwardRef<HTMLButtonElement, CellActionProps>(
  function CellAction({ className, children, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "focus-visible:ring-ring/50 text-primary cursor-pointer text-left font-semibold tracking-wide hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
