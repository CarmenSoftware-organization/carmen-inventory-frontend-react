import { useCallback, useEffect, useRef, type ReactNode } from "react";
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
  /**
   * วัดความสูงแถวจริงแทนการเชื่อ `estimateSize` — เปิดเมื่อแถวสูงไม่เท่ากัน
   * (เช่นการ์ดที่มี/ไม่มีบรรทัดคำอธิบาย) ไม่งั้นแถวจะซ้อนหรือเว้นช่อง
   */
  readonly measureRows?: boolean;
}

/** เริ่มโหลดหน้าถัดไปเมื่อเหลืออีกกี่แถวก่อนถึงท้าย — ข้อมูลมาทันก่อนผู้ใช้เลื่อนถึง */
const PREFETCH_ROWS = 5;

/**
 * Virtualized list ใช้แทน CommandList ของ shadcn เมื่อรายการเยอะ
 *
 * ใช้ @tanstack/react-virtual เพื่อ render เฉพาะแถวที่มองเห็น ลด DOM nodes
 * และทำให้ lookup ที่มี options หลายพันรายการยังลื่นอยู่ รองรับ infinite
 * scroll ผ่าน onLoadMore (trigger เมื่อเหลืออีก 5 แถวก่อนถึงท้าย) และ
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
  measureRows = false,
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
    if (
      scrollHeight - scrollTop - clientHeight <
      PREFETCH_ROWS * estimateSize
    ) {
      onLoadMore();
    }
  }, [onLoadMore, hasMore, isLoadingMore, estimateSize]);

  // onScroll ยิงได้เฉพาะเมื่อมีแถบเลื่อน — ถ้ารายการว่าง (ไม่มี scroll element) หรือสั้นจนไม่พอให้เลื่อน
  // (เช่น กรองฝั่ง client เหลือไม่กี่แถว ทั้งที่ยังมีหน้าถัดไป) จะไม่มีทางโหลดต่อ จึงโหลดหน้าถัดไปเอง
  // ไล่ทีละหน้าจนกว่าจะเต็มกล่องหรือหมดหน้า · เรียกซ้ำได้ปลอดภัยเพราะ loadMore ของ
  // useLookupPagination เช็ค hasMore && !isLoading และ effect นี้รันใหม่เฉพาะเมื่อ deps เปลี่ยน
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoadingMore) return;
    const el = parentRef.current;
    if (items.length === 0 || (el && el.scrollHeight - el.clientHeight < 50)) {
      onLoadMore();
    }
  }, [items.length, hasMore, isLoadingMore, onLoadMore]);

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
      className="scroll-py-1 overflow-x-hidden overflow-y-auto p-1"
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
            data-index={virtualRow.index}
            ref={measureRows ? virtualizer.measureElement : undefined}
            className="absolute top-0 left-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            {children(items[virtualRow.index], virtualRow.index)}
          </div>
        ))}
      </div>
      {isLoadingMore && (
        <div className="text-muted-foreground flex justify-center py-2 text-xs">
          Loading more...
        </div>
      )}
    </div>
  );
}
