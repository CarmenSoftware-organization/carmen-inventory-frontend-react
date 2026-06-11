import type { PurchaseRequest } from "@/types/purchase-request";
import EmptyComponent from "@/components/empty-component";
import PrCard from "./pr-card";

interface PrCardListProps {
  readonly items: PurchaseRequest[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: PurchaseRequest) => void;
  readonly onApprove?: (item: PurchaseRequest) => void;
  readonly onReject?: (item: PurchaseRequest) => void;
  readonly onDelete?: (item: PurchaseRequest) => void;
  readonly isMyPending?: boolean;
}

/**
 * Skeleton สำหรับแสดงระหว่างโหลดการ์ด PR ใน grid view
 * @returns React element ของ skeleton การ์ด PR
 * @example
 * <PrCardSkeleton />
 */
function PrCardSkeleton() {
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
        <div className="h-4 w-24 rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * รายการการ์ด PR แบบ responsive grid พร้อม skeleton ระหว่างโหลดและ empty state เมื่อไม่มีข้อมูล
 * @param props - Props ของ `PrCardList`
 * @param props.items - รายการ PR ที่จะแสดง
 * @param props.isLoading - flag ระบุว่ากำลังโหลด
 * @param props.onEdit - callback เมื่อคลิกการ์ดเพื่อแก้ไข
 * @param props.onApprove - callback เมื่อกด approve
 * @param props.onReject - callback เมื่อกด reject
 * @param props.onDelete - callback เมื่อกด delete
 * @param props.isMyPending - flag ว่าอยู่ใน view my-pending
 * @returns React element ของ grid การ์ด PR
 * @example
 * <PrCardList items={prs} isLoading={false} onEdit={handleEdit} isMyPending />
 */
export default function PrCardList({
  items,
  isLoading,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  isMyPending = false,
}: PrCardListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <PrCardSkeleton key={`skeleton-${i}`} />
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
        <PrCard
          key={item.id}
          item={item}
          index={i}
          onEdit={onEdit}
          onApprove={onApprove}
          onReject={onReject}
          onDelete={onDelete}
          isMyPending={isMyPending}
        />
      ))}
    </div>
  );
}
