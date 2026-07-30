import type { InventoryAdjustment } from "@/types/inventory-adjustment";
import EmptyComponent from "@/components/empty-component";
import { Skeleton } from "@/components/ui/skeleton";
import IaCard from "./ia-card";

interface IaCardListProps {
  readonly items: InventoryAdjustment[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: InventoryAdjustment) => void;
  readonly onDelete: (item: InventoryAdjustment) => void;
}

function IaCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border">
      <div className="flex items-start justify-between gap-2 px-3.5 py-3">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
      <div className="border-t" />
      <div className="space-y-2 px-3.5 py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={`row-${i}`}
            className="flex items-center justify-between gap-3"
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="border-t" />
      <div className="flex items-center justify-end px-2 py-1.5">
        <Skeleton className="h-6 w-9" />
      </div>
    </div>
  );
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
        <IaCardSkeleton />
        <IaCardSkeleton />
        <IaCardSkeleton />
        <IaCardSkeleton />
        <IaCardSkeleton />
        <IaCardSkeleton />
        <IaCardSkeleton />
        <IaCardSkeleton />
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
