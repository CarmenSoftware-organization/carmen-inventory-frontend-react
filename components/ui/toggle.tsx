import * as React from "react";
import { Toggle as TogglePrimitive } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const toggleVariants = cva(
  "focus-visible:border-ring focus-visible:ring-ring/50 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "data-[state=on]:bg-accent data-[state=on]:text-accent-foreground rounded-md bg-transparent",
        outline:
          "border-border/60 bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md border",
        /** pill toggle สำหรับ dense row — ติดแล้วเป็น primary (selected state) */
        pill: "border-border/60 bg-card text-micro text-muted-foreground hover:border-foreground/30 hover:text-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-full border",
      },
      size: {
        default: "h-8 px-2.5",
        sm: "h-7 px-2",
        xs: "px-2 py-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * Toggle component ห่อ Radix Toggle (ปุ่มเปิด/ปิดสถานะ aria-pressed)
 * @param props - props ของ Radix Toggle Root + variant/size
 * @returns React element toggle button
 * @example
 * <Toggle variant="pill" size="xs" pressed={on} onPressedChange={setOn}>View</Toggle>
 */
function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
