import type { PurchaseOrder } from "@/types/purchase-order";
import EmptyComponent from "@/components/empty-component";
import PoCard from "./po-card";

interface PoCardListProps {
  readonly items: PurchaseOrder[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: PurchaseOrder) => void;
}

/**
 * Skeleton การ์ด PO ระหว่างโหลดข้อมูล
 * ใช้ animate-pulse เลียนโครงการ์ดจริง เพื่อป้องกัน layout shift
 *
 * @returns React element ของ skeleton การ์ด PO
 * @example
 * {isLoading && <PoCardSkeleton />}
 */
function PoCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border bg-card">
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
            <div className="h-2.5 w-16 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="mt-0.5 size-3 rounded bg-muted" />
          <div className="space-y-1">
            <div className="h-2.5 w-14 rounded bg-muted" />
            <div className="h-3 w-20 rounded bg-muted" />
          </div>
        </div>
      </div>
      <div className="border-t" />
      <div className="flex items-center justify-between px-4 py-2">
        <div className="h-3 w-14 rounded bg-muted" />
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * รายการการ์ด PO แบบ grid สำหรับ mobile/card view
 * แสดง skeleton ระหว่าง loading และ EmptyComponent เมื่อไม่มีข้อมูล
 *
 * @param props - props ของ card list
 * @param props.items - รายการ PurchaseOrder ที่จะแสดง
 * @param props.isLoading - สถานะกำลังโหลด
 * @param props.onEdit - callback เมื่อกดแก้ไขการ์ด
 * @returns React element ของ grid การ์ด PO
 * @example
 * <PoCardList items={purchaseOrders} isLoading={isLoading} onEdit={(po) => router.push(`/procurement/purchase-order/${po.id}`)} />
 */
export default function PoCardList({
  items,
  isLoading,
  onEdit,
}: PoCardListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PoCardSkeleton key={`skeleton-${i}`} />
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
        <PoCard key={item.id} item={item} index={i} onEdit={onEdit} />
      ))}
    </div>
  );
}
