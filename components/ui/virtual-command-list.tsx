
import { useCallback, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualCommandListProps<T> {
  readonly items: T[];
  readonly estimateSize?: number;
  readonly maxHeight?: number;
  readonly emptyMessage?: ReactNode;
  readonly children: (item: T, index: number) => ReactNode;
  readonly onLoadMore?: () => void;
  readonly hasMore?: boolean;
  readonly isLoadingMore?: boolean;
}

/**
 * Virtualized list ใช้แทน CommandList ของ shadcn เมื่อรายการเยอะ
 *
 * ใช้ @tanstack/react-virtual เพื่อ render เฉพาะแถวที่มองเห็น ลด DOM nodes
 * และทำให้ lookup ที่มี options หลายพันรายการยังลื่นอยู่ รองรับ infinite
 * scroll ผ่าน onLoadMore (trigger เมื่อ scroll ใกล้ถึงขอบ 50px) และ
 * spinner ระหว่างโหลดเพิ่ม ถ้า items ว่างจะ render empty slot
 *
 * @param props - items, children (render-prop), estimateSize, maxHeight,
 *                emptyMessage, onLoadMore, hasMore, isLoadingMore
 * @returns JSX element ของ virtualized list
 * @example
 * ```tsx
 * <VirtualCommandList
 *   items={products}
 *   onLoadMore={fetchNextPage}
 *   hasMore={hasNextPage}
 *   isLoadingMore={isFetchingNextPage}
 * >
 *   {(p) => <CommandItem key={p.id} value={p.id}>{p.name}</CommandItem>}
 * </VirtualCommandList>
 * ```
 */
export function VirtualCommandList<T>({
  items,
  estimateSize = 32,
  maxHeight = 300,
  emptyMessage = "No results found.",
  children,
  onLoadMore,
  hasMore,
  isLoadingMore,
}: VirtualCommandListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 5,
  });

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el || !onLoadMore || !hasMore || isLoadingMore) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight < 50) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoadingMore]);

  if (items.length === 0) {
    return (
      <div data-slot="command-empty" className="py-6 text-center text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      data-slot="command-list"
      className="overflow-x-hidden overflow-y-auto scroll-py-1 p-1"
      style={{ maxHeight }}
      onScroll={handleScroll}
    >
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {children(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
      {isLoadingMore && (
        <div className="flex justify-center py-2 text-xs text-muted-foreground">Loading more...</div>
      )}
    </div>
  );
}
