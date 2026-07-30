import type { CreditNote } from "@/types/credit-note";
import EmptyComponent from "@/components/empty-component";
import { ListCardSkeleton } from "@/components/share/list-card";
import CnCard from "./cn-card";

interface CnCardListProps {
  readonly items: CreditNote[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: CreditNote) => void;
  readonly onDelete: (item: CreditNote) => void;
}

/**
 * แสดงรายการใบลดหนี้เป็น grid ของการ์ด รองรับสถานะโหลดและว่างเปล่า
 * ขณะ loading จะ render 8 skeleton cards, ถ้าไม่มีข้อมูลจะ render `EmptyComponent`, ไม่เช่นนั้น map `CnCard`
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
  onDelete,
}: CnCardListProps) {
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
        <CnCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
