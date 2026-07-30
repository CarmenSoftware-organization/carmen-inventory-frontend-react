import type { PurchaseOrder } from "@/types/purchase-order";
import EmptyComponent from "@/components/empty-component";
import { ListCardSkeleton } from "@/components/share/list-card";
import PoCard from "./po-card";

interface PoCardListProps {
  readonly items: PurchaseOrder[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: PurchaseOrder) => void;
  readonly onDelete: (item: PurchaseOrder) => void;
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
  onDelete,
}: PoCardListProps) {
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
        <PoCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
