import { Skeleton } from "@/components/ui/skeleton";

/** meta cell skeleton — mirror stacked label/value ใน header จริง */
function MetaSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-2.5 w-14" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

/** row skeleton — mirror grouped view (# · Product · pricing · tax · amount) */
function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <Skeleton className="h-4 w-5 shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-14" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

/**
 * Loading skeleton ของหน้า RFQ portal — สะท้อนโครงจริง (header hero + meta row +
 * ตารางรายการ) ด้วยกล่องเทา animate-pulse เงียบ ๆ ตาม DESIGN.md: ไม่มี spinner/
 * เงา, ใช้ container + spacing ชุดเดียวกับเนื้อหาจริง (`max-w-5xl` · `space-y-6`)
 * เพื่อให้ layout ไม่กระโดดตอนโหลดเสร็จ
 */
export default function PriceListExternalSkeleton() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-6 p-6"
      aria-busy="true"
      aria-label="Loading request for pricing"
    >
      {/* header */}
      <header className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-8 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-md" />
        </div>
        <div className="flex flex-wrap gap-x-10 gap-y-4">
          <MetaSkeleton />
          <MetaSkeleton />
          <MetaSkeleton />
          <MetaSkeleton />
        </div>
      </header>

      {/* instruction + mode toggle */}
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-52" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>

      {/* items table */}
      <div className="divide-border/60 border-border overflow-hidden rounded-lg border divide-y">
        <RowSkeleton />
        <RowSkeleton />
        <RowSkeleton />
      </div>
    </div>
  );
}
