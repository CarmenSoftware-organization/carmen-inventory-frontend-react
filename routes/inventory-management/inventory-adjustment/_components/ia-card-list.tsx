import type { InventoryAdjustment } from "@/types/inventory-adjustment";
import EmptyComponent from "@/components/empty-component";
import { Skeleton } from "@/components/ui/skeleton";
import IaCard from "./ia-card";

interface IaCardListProps {
  readonly items: InventoryAdjustment[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: InventoryAdjustment) => void;
}

function IaCardSkeleton() {
  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
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
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-start gap-2">
          <Skeleton className="mt-0.5 size-3" />
          <div className="space-y-1">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Skeleton className="mt-0.5 size-3" />
          <div className="space-y-1">
            <Skeleton className="h-2.5 w-12" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
      <div className="border-t" />
      <div className="flex items-center justify-between px-4 py-2.5">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export default function IaCardList({
  items,
  isLoading,
  onEdit,
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
      {items.map((item, i) => (
        <IaCard key={item.id} item={item} index={i} onEdit={onEdit} />
      ))}
    </div>
  );
}
