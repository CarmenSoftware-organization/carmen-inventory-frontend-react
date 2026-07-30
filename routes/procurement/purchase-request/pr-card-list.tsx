import type { PurchaseRequest } from "@/types/purchase-request";
import EmptyComponent from "@/components/empty-component";
import { ListCardSkeleton } from "@/components/share/list-card";
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
          <ListCardSkeleton key={`skeleton-${i}`} />
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
        <PrCard
          key={item.id}
          item={item}
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
