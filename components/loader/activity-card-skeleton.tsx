import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton 1 รายการ activity card
 *
 * Render placeholder สำหรับ activity card ขณะ loading ประกอบด้วย header
 * (badge + timestamp), body (icon + labels หลายบรรทัด) และ footer
 * ใช้ `aria-hidden` เพื่อไม่ให้ screen reader อ่าน
 *
 * @returns JSX element ของ skeleton item
 * @example
 * ```tsx
 * <ActivityCardSkeletonItem />
 * ```
 */
function ActivityCardSkeletonItem() {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2" aria-hidden="true">
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
      <div className="flex items-center gap-3 pt-1 border-t">
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

/**
 * Grid ของ activity card skeleton
 *
 * Render grid responsive (1/2/3/4 คอลัมน์ตามขนาดจอ) ของ
 * `ActivityCardSkeletonItem` จำนวน `count` รายการ ใช้ `aria-busy` และ
 * `aria-live="polite"` เพื่อแจ้ง screen reader ว่ากำลัง loading
 *
 * @param props - props ของ grid
 * @param props.count - จำนวน skeleton items (default 8)
 * @returns JSX element ของ grid skeleton
 * @example
 * ```tsx
 * <ActivityCardSkeletonGrid count={12} />
 * ```
 */
export function ActivityCardSkeletonGrid({ count = 8 }: ActivityCardSkeletonGridProps) {
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
