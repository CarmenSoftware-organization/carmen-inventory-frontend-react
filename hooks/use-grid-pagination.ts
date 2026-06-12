import { useState, useEffect, useRef } from "react";
import type { PaginatedResponse, ParamsDto } from "@/types/params";

interface UseGridPaginationOptions<T> {
  // Accept any hook shape that takes params + an options object with `enabled`
  // and returns { data, isLoading }. Avoids forcing every list hook to match
  // the exact UseQueryOptions shape from react-query.
  useListHook: (
    params?: ParamsDto,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options?: any,
  ) => {
    data: PaginatedResponse<T> | undefined;
    isLoading: boolean;
    error?: Error | null;
    refetch?: () => unknown;
  };
  params: ParamsDto;
  enabled: boolean;
  /**
   * Extra value folded into the reset signature. Use when the same params drive
   * two different list hooks (e.g. a my-pending vs all-document toggle): the
   * accumulated items/page reset to 1 when this changes, so the new list does
   * not get appended onto the previous one's pages.
   */
  resetKey?: unknown;
}

/**
 * Hook จัดการ infinite scroll pagination สำหรับ grid/list บนมือถือ
 * ใช้ IntersectionObserver ตรวจจับ sentinel element เพื่อโหลดหน้าถัดไป
 * รีเซ็ตรายการเมื่อ filter/search เปลี่ยน และ dedupe ตาม id ของ item
 * @param options - object ประกอบด้วย useListHook, params และ enabled
 * @returns object ประกอบด้วย items, totalRecords, isLoading, isLoadingMore, hasMore, sentinelRef, error และ refetch
 * @example
 * const { items, hasMore, sentinelRef, isLoadingMore } = useGridPagination({
 *   useListHook: useVendor,
 *   params: { search: query },
 *   enabled: isMobile,
 * });
 */
export function useGridPagination<T>({
  useListHook,
  params,
  enabled,
  resetKey,
}: UseGridPaginationOptions<T>) {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<T[]>([]);
  const prevParamsRef = useRef<string>("");
  const observerRef = useRef<IntersectionObserver | null>(null);
  const isLoadingRef = useRef(false);

  // Reset when filters/search change — or when resetKey changes (same params,
  // different list hook).
  const paramsKey = JSON.stringify({ ...params, page: undefined, resetKey });
  useEffect(() => {
    if (prevParamsRef.current !== paramsKey) {
      prevParamsRef.current = paramsKey;
      setPage(1);
      setAllItems([]);
    }
  }, [paramsKey]);

  const gridParams = enabled
    ? { ...params, page, perpage: params.perpage ?? 20 }
    : undefined;

  const { data, isLoading, error, refetch } = useListHook(gridParams, {
    enabled,
  });

  // Append new page data
  useEffect(() => {
    if (!enabled || !data?.data) return;
    const newItems = data.data;
    if (newItems.length > 0) {
      setAllItems((prev) => {
        const merged = page === 1 ? newItems : [...prev, ...newItems];
        const seen = new Set<unknown>();
        return merged.filter((it) => {
          const id = (it as { id?: unknown }).id;
          if (id == null) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      });
    } else if (page === 1) {
      setAllItems([]);
    }
  }, [data?.data, page, enabled]);

  const totalPages = data?.paginate?.pages ?? 1;
  const totalRecords = data?.paginate?.total ?? 0;
  const hasMore = page < totalPages;

  // Track loading via ref so observer doesn't re-create on every fetch cycle.
  // (Re-creating observer = re-trigger on mount when sentinel still in viewport,
  // which causes runaway page increments when content fits viewport.)
  isLoadingRef.current = isLoading;

  // Callback ref — creates IntersectionObserver once per sentinel/enabled/hasMore
  const sentinelRef = (node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node || !enabled || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingRef.current) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0 },
    );
    observerRef.current.observe(node);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return {
    items: allItems,
    totalRecords,
    isLoading: isLoading && page === 1,
    isLoadingMore: isLoading && page > 1,
    hasMore,
    sentinelRef,
    error: error ?? null,
    refetch,
  };
}
