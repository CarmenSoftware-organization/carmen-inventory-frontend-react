import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

/**
 * Skeleton 1 รายการ card
 *
 * Render placeholder ของ card list item ขณะ loading ประกอบด้วย
 * CardHeader (title, sub-info, badge) และ CardContent (2 แถวของ icon + text)
 *
 * @returns JSX element ของ skeleton card
 * @example
 * ```tsx
 * <CardSkeletonItem />
 * ```
 */
function CardSkeletonItem() {
  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-4 py-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="space-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-3 rounded-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex items-start gap-2">
          <Skeleton className="mt-0.5 size-3 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CardSkeletonGridProps {
  readonly count?: number;
}

/**
 * Grid ของ card skeleton
 *
 * ใช้สำหรับสถานะ loading ของ list page โหมด card view render grid
 * responsive (1/2/3/4 คอลัมน์) ของ `CardSkeletonItem` จำนวน `count` รายการ
 *
 * @param props - props ของ grid
 * @param props.count - จำนวน skeleton cards (default 8)
 * @returns JSX element ของ grid skeleton
 * @example
 * ```tsx
 * <CardSkeletonGrid count={6} />
 * ```
 */
export function CardSkeletonGrid({ count = 8 }: CardSkeletonGridProps) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, i) => (
        <CardSkeletonItem key={i} />
      ))}
    </div>
  );
}
