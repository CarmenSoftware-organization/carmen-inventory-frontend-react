import type { InventoryAdjustment } from "@/types/inventory-adjustment";
import EmptyComponent from "@/components/empty-component";
import { ListCardSkeleton } from "@/components/share/list-card";
import IaCard from "./ia-card";

interface IaCardListProps {
  readonly items: InventoryAdjustment[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: InventoryAdjustment) => void;
  readonly onDelete: (item: InventoryAdjustment) => void;
}

export default function IaCardList({
  items,
  isLoading,
  onEdit,
  onDelete,
}: IaCardListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ListCardSkeleton />
        <ListCardSkeleton />
        <ListCardSkeleton />
        <ListCardSkeleton />
        <ListCardSkeleton />
        <ListCardSkeleton />
        <ListCardSkeleton />
        <ListCardSkeleton />
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyComponent />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <IaCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
