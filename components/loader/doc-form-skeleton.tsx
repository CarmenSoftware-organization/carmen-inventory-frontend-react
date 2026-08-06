import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton 1 field (label + control) — สูงเท่า `Field` + control size sm ของจริง
 */
function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

/**
 * Skeleton ของ header ฟอร์มเอกสาร — mirror `DocFormHeader`
 * (title + badge + version, subtitle ผู้สร้าง/วันที่, ปุ่มขวา)
 */
function HeaderSkeleton() {
  return (
    <div className="px-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3.5 w-14" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton ของตารางรายการ — header row + แถวข้อมูล ความสูงเท่า DataGrid ของจริง
 */
function ItemTableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="bg-muted/40 flex items-center gap-4 border-b px-3 py-2">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 flex-[3]" />
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="h-3 flex-1" />
        <Skeleton className="h-3 flex-1" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b px-3 py-2.5 last:border-b-0"
        >
          <Skeleton className="h-3.5 w-8" />
          <Skeleton className="h-3.5 flex-[3]" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 flex-1" />
        </div>
      ))}
    </div>
  );
}

interface DocFormSkeletonProps {
  /** จำนวนช่องในส่วนหัวใบ (grid 6 คอลัมน์เหมือนของจริง) */
  readonly fields?: number;
  /** จำนวนแถวรายการที่แสดงตอนโหลด */
  readonly rows?: number;
}

/**
 * Skeleton ของฟอร์มเอกสาร (PR/PO/GRN/SR/CN) — ตรงกับ layout จริงหลังจัดฟอร์ม
 * ทั้ง 5 โมดูลให้เป็นแบบเดียวกัน: header → general fields 6 คอลัมน์ → เส้นคั่น →
 * ตารางรายการ → summary footer bar ติดล่าง
 *
 * (ฟอร์มแบบ Soft Sheet ที่มี hero/sidebar ใช้ `FormSkeleton` ตัวเดิม)
 *
 * @param props.fields จำนวนช่องหัวใบ (default 12)
 * @param props.rows จำนวนแถวรายการ (default 4)
 * @returns JSX element ของ skeleton ฟอร์มเอกสาร
 * @example
 * ```tsx
 * {isLoading ? <DocFormSkeleton /> : <CnForm creditNote={data} />}
 * ```
 */
export function DocFormSkeleton({
  fields = 12,
  rows = 4,
}: DocFormSkeletonProps) {
  return (
    <div className="flex min-h-full flex-col space-y-4" aria-busy="true">
      <HeaderSkeleton />

      <div className="space-y-3 px-4">
        <div className="grid grid-cols-1 gap-x-2 gap-y-4 sm:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: fields }, (_, i) => (
            <FieldSkeleton key={i} />
          ))}
        </div>

        <hr className="border-border" />

        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-end">
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <ItemTableSkeleton rows={rows} />
        </div>
      </div>

      {/* summary footer bar — sticky ล่างเหมือนของจริง กันหน้ากระตุกตอนสลับ */}
      <div className="bg-background sticky bottom-0 z-20 mt-auto flex flex-wrap items-center justify-between gap-3 border-t p-2 sm:flex-nowrap sm:gap-4">
        <div className="flex items-center gap-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
