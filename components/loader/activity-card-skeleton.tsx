import { Skeleton } from "@/components/ui/skeleton";

function ActivityCardSkeletonItem() {
  return (
    <div className="bg-card space-y-2 rounded-lg border p-3" aria-hidden="true">
      {/* Header: action badge + timestamp */}
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-3.5 w-28" />
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="ml-[1.125rem] h-3 w-40" />
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 border-t pt-1">
        <div className="flex items-center gap-1.5">
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

interface ActivityCardSkeletonGridProps {
  readonly count?: number;
}

export function ActivityCardSkeletonGrid({
  count = 8,
}: ActivityCardSkeletonGridProps) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }, (_, i) => (
        <ActivityCardSkeletonItem key={i} />
      ))}
    </div>
  );
}
