import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import EmptyComponent from "@/components/empty-component";
import GrnCard from "./grn-card";

interface GrnCardListProps {
  readonly items: GoodsReceiveNote[];
  readonly isLoading?: boolean;
  readonly onEdit: (item: GoodsReceiveNote) => void;
}

function GrnCardSkeleton() {
  return (
    <div className="bg-card animate-pulse rounded-xl border">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="space-y-1.5">
          <div className="bg-muted h-4 w-28 rounded" />
          <div className="bg-muted h-3 w-20 rounded" />
        </div>
        <div className="bg-muted h-5 w-16 rounded-full" />
      </div>
      <div className="border-t" />
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="bg-muted mt-0.5 size-3 rounded" />
          <div className="space-y-1">
            <div className="bg-muted h-2.5 w-12 rounded" />
            <div className="bg-muted h-3 w-32 rounded" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="bg-muted mt-0.5 size-3 rounded" />
          <div className="space-y-1">
            <div className="bg-muted h-2.5 w-14 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="bg-muted mt-0.5 size-3 rounded" />
          <div className="space-y-1">
            <div className="bg-muted h-2.5 w-10 rounded" />
            <div className="bg-muted h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="border-t" />
      <div className="flex items-center justify-between px-4 py-2">
        <div className="bg-muted h-3 w-14 rounded" />
        <div className="bg-muted h-4 w-24 rounded" />
      </div>
    </div>
  );
}

export default function GrnCardList({
  items,
  isLoading,
  onEdit,
}: GrnCardListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <GrnCardSkeleton key={`skeleton-${i}`} />
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
        <GrnCard key={item.id} item={item} index={i} onEdit={onEdit} />
      ))}
    </div>
  );
}
