import type { StoreRequisition } from "@/types/store-requisition";
import EmptyComponent from "@/components/empty-component";
import { ListCardSkeleton } from "@/components/share/list-card";
import SrCard from "./sr-card";

interface SrCardListProps {
  readonly items: StoreRequisition[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: StoreRequisition) => void;
  readonly onDelete: (item: StoreRequisition) => void;
}

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
        <SrCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
