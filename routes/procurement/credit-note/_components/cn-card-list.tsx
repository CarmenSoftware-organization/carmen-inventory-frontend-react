import type { CreditNote } from "@/types/credit-note";
import EmptyComponent from "@/components/empty-component";
import CnCard from "./cn-card";

interface CnCardListProps {
  readonly items: CreditNote[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: CreditNote) => void;
}

/**
 * Skeleton placeholder ของการ์ดใบลดหนี้ระหว่างโหลดข้อมูล
 * ใช้รูปทรงและสัดส่วนเหมือน `CnCard` จริง เพื่อกัน layout shift
 *
 * @returns React element ของ skeleton การ์ดใบลดหนี้
 *
 * @example
 * {isLoading && <CnCardSkeleton />}
 */
function CnCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="space-y-1.5">
          <div className="h-4 w-28 rounded bg-muted" />
          <div className="h-3 w-20 rounded bg-muted" />
        </div>
        <div className="h-5 w-16 rounded-full bg-muted" />
      </div>
      <div className="border-t" />
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 size-3 rounded bg-muted" />
          <div className="space-y-1">
            <div className="h-2.5 w-12 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 size-3 rounded bg-muted" />
          <div className="space-y-1">
            <div className="h-2.5 w-10 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 size-3 rounded bg-muted" />
          <div className="space-y-1">
            <div className="h-2.5 w-14 rounded bg-muted" />
            <div className="h-3 w-12 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="border-t" />
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="h-3 w-14 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * แสดงรายการใบลดหนี้เป็น grid ของการ์ด รองรับสถานะโหลดและว่างเปล่า
 * ขณะ loading จะ render 8 skeleton cards, ถ้าไม่มีข้อมูลจะ render `EmptyComponent`, ไม่เช่นนั้น map `CnCard` พร้อม index
 *
 * @param props - CnCardListProps
 * @param props.items - array ของใบลดหนี้
 * @param props.isLoading - สถานะโหลด (optional) — true จะแสดง skeleton
 * @param props.onEdit - callback เมื่อคลิกการ์ดเพื่อไปหน้า edit/view
 * @returns React element ของ grid การ์ด, skeleton หรือ empty state
 *
 * @example
 * <CnCardList items={creditNotes} isLoading={isLoading} onEdit={(cn) => router.push(`/procurement/credit-note/${cn.id}`)} />
 */
export default function CnCardList({
  items,
  isLoading,
  onEdit,
}: CnCardListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CnCardSkeleton key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyComponent />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item, i) => (
        <CnCard key={item.id} item={item} index={i} onEdit={onEdit} />
      ))}
    </div>
  );
}
