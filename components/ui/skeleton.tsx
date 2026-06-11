import { cn } from "@/lib/utils"

/** Placeholder skeleton แบบ animate-pulse สำหรับแสดงตอนโหลด (shadcn) */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
