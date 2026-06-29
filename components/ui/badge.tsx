import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border border-transparent font-semibold tracking-tight w-fit whitespace-nowrap shrink-0 outline-none transition-[color,box-shadow,transform] overflow-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive disabled:pointer-events-none disabled:opacity-50 [a&]:active:scale-95 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        success:
          "bg-success text-white dark:text-black [a&]:hover:bg-success/90 focus-visible:ring-success/20 dark:focus-visible:ring-success/40",
        info: "bg-info text-primary-foreground [a&]:hover:bg-info/90 focus-visible:ring-info/20 dark:focus-visible:ring-info/40",
        warning:
          "bg-warning text-[var(--status-in-progress-fg)] [a&]:hover:bg-warning/90 focus-visible:ring-warning/20 dark:focus-visible:ring-warning/40",
        outline:
          "border-border bg-transparent text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground dark:bg-input/32",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
        invert: "bg-invert text-invert-foreground",
        "primary-light":
          "bg-primary/10 border-none text-primary dark:bg-primary/20 dark:text-primary",
        "warning-light":
          "bg-warning/10 border-none text-warning-foreground dark:bg-warning/20 dark:text-warning",
        "success-light":
          "bg-success/10 border-none text-success-foreground dark:bg-success/20 dark:text-success",
        "info-light":
          "bg-info/10 border-none text-info-foreground dark:bg-info/20 dark:text-info",
        "destructive-light":
          "bg-destructive/10 border-none text-destructive dark:bg-destructive/20 dark:text-destructive",
        "invert-light":
          "bg-invert/10 border-none text-foreground dark:bg-invert/20",
        "primary-outline":
          "bg-background border-primary/40 text-primary dark:bg-input/30",
        "warning-outline":
          "bg-background border-warning/40 text-warning-foreground dark:bg-input/30 dark:text-warning",
        "success-outline":
          "bg-background border-success/40 text-success-foreground dark:bg-input/30 dark:text-success",
        "info-outline":
          "bg-background border-info/40 text-info-foreground dark:bg-input/30 dark:text-info",
        "destructive-outline":
          "bg-background border-destructive/40 text-destructive dark:bg-input/30",
        "invert-outline":
          "bg-background border-invert/40 text-invert-foreground dark:bg-input/30",
      },
      size: {
        xs: "px-2 py-0.5 text-[0.6875rem] leading-none h-5 min-w-5 gap-1",
        sm: "px-2 py-0.5 text-[0.75rem] leading-none h-5.5 min-w-5.5 gap-1",
        default: "px-2 py-0.5 text-[0.8125rem] h-6 min-w-6 gap-1",
        lg: "px-3 py-0.5 text-[0.875rem] h-6.5 min-w-6.5 gap-1.5",
        xl: "px-3.5 py-1 text-[0.9375rem] h-7.5 min-w-7.5 gap-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface BadgeProps
  extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

/**
 * Badge component สำหรับแสดงสถานะ/แท็ก มีหลาย variant และขนาด
 * @param props - variant, size, asChild และ props ของ span
 * @returns React element ของ badge
 */
function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: Readonly<BadgeProps>) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants, type BadgeProps };
