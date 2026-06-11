import type { StoreRequisition } from "@/types/store-requisition";
import EmptyComponent from "@/components/empty-component";
import SrCard from "./sr-card";

interface SrCardListProps {
  readonly items: StoreRequisition[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: StoreRequisition) => void;
}

/**
 * Placeholder skeleton สำหรับการ์ด SR ขณะกำลังโหลดข้อมูล
 * ใช้ภายใน SrCardList เมื่อ isLoading = true
 *
 * @returns คอมโพเนนต์ skeleton ของการ์ด
 * @example
 * {isLoading && <SrCardSkeleton />}
 */
function SrCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border bg-card shadow-sm">
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
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 size-3 rounded bg-muted" />
          <div className="space-y-1">
            <div className="h-2.5 w-14 rounded bg-muted" />
            <div className="h-3 w-32 rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 size-3 rounded bg-muted" />
          <div className="space-y-1">
            <div className="h-2.5 w-16 rounded bg-muted" />
            <div className="h-3 w-28 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="border-t" />
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="h-3 w-14 rounded bg-muted" />
        <div className="h-4 w-8 rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * แสดงรายการใบเบิกสินค้าแบบ grid ของการ์ด พร้อม skeleton และ empty state
 * ใช้ใน sr-component เมื่ออยู่ในโหมด grid หรือบน mobile
 *
 * @param props - items, isLoading, onEdit handler
 * @param props.items - รายการ StoreRequisition
 * @param props.isLoading - สถานะกำลังโหลด
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @returns คอมโพเนนต์ list ของการ์ด SR
 * @example
 * <SrCardList items={items} isLoading={false} onEdit={(it) => router.push(`/.../${it.id}`)} />
 */
export default function SrCardList({
  items,
  isLoading,
  onEdit,
}: SrCardListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SrCardSkeleton key={`skeleton-${i}`} />
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
        <SrCard key={item.id} item={item} index={i} onEdit={onEdit} />
      ))}
    </div>
  );
}
