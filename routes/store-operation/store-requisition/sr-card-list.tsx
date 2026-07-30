import type { StoreRequisition } from "@/types/store-requisition";
import EmptyComponent from "@/components/empty-component";
import SrCard from "./sr-card";

interface SrCardListProps {
  readonly items: StoreRequisition[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: StoreRequisition) => void;
  readonly onDelete: (item: StoreRequisition) => void;
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
    <div className="bg-card animate-pulse overflow-hidden rounded-xl border">
      <div className="flex items-start justify-between gap-2 px-3.5 py-3">
        <div className="space-y-1.5">
          <div className="bg-muted h-4 w-28 rounded" />
          <div className="bg-muted h-3 w-24 rounded" />
        </div>
        <div className="bg-muted h-5 w-20 rounded-md" />
      </div>
      <div className="border-t" />
      <div className="space-y-2 px-3.5 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`row-${i}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="bg-muted h-3 w-16 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="border-t" />
      <div className="flex items-center justify-end px-2 py-1.5">
        <div className="bg-muted h-6 w-9 rounded-md" />
      </div>
    </div>
  );
}

/**
 * แสดงรายการใบเบิกสินค้าแบบ grid ของการ์ด พร้อม skeleton และ empty state
 * ใช้ใน sr-component เมื่ออยู่ในโหมด grid หรือบน mobile
 *
 * @param props - items, isLoading, onEdit/onDelete handler
 * @param props.items - รายการ StoreRequisition
 * @param props.isLoading - สถานะกำลังโหลด
 * @param props.onEdit - callback เมื่อคลิกการ์ด
 * @param props.onDelete - callback เมื่อกดปุ่มลบในการ์ด
 * @returns คอมโพเนนต์ list ของการ์ด SR
 * @example
 * <SrCardList items={items} isLoading={false} onEdit={(it) => navigate(`/.../${it.id}`)} onDelete={setDeleteTarget} />
 */
export default function SrCardList({
  items,
  isLoading,
  onEdit,
  onDelete,
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
      {items.map((item) => (
        <SrCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
