import { useState, useEffect } from "react";
import type { PaginatedResponse } from "@/types/params";

interface UseLookupPaginationOptions<T> {
  useListHook: (
    params: { search?: string; perpage: number; page?: number },
    options?: { enabled?: boolean },
  ) => {
    data: PaginatedResponse<T> | undefined;
    isLoading: boolean;
  };
  search: string;
  perpage?: number;
  filter?: (item: T) => boolean;
  /** Extra dependencies that trigger a full reset (e.g. parent filter ID) */
  resetDeps?: unknown[];
  /**
   * ถ้า false จะไม่ fetch (lazy) — ใช้คู่กับ `onOpenChange` ของ lookup เพื่อยิง API
   * ตอนผู้ใช้เปิด popover เท่านั้น ลด traffic ที่ไม่ได้ใช้ (default true)
   * ต้องให้ `useListHook` รองรับ `options.enabled` ถึงจะมีผล
   */
  enabled?: boolean;
}

/**
 * Hook จัดการ pagination สำหรับ lookup/combobox แบบโหลดเพิ่มทีละหน้า
 * รีเซ็ตรายการเมื่อ search หรือ resetDeps เปลี่ยน และต่อหน้าถัดไปเมื่อ loadMore
 * รองรับการกรองรายการหลังโหลดด้วย filter function
 * @param options - useListHook, search, perpage, filter และ resetDeps
 * @returns object ประกอบด้วย items, isLoading, isLoadingMore, hasMore และ loadMore
 * @example
 * const { items, hasMore, loadMore, isLoadingMore } = useLookupPagination({
 *   useListHook: useProduct,
 *   search,
 *   filter: (p) => p.is_active,
 * });
 */
export function useLookupPagination<T>({
  useListHook,
  search,
  perpage = 30,
  filter,
  resetDeps = [],
  enabled = true,
}: UseLookupPaginationOptions<T>) {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<T[]>([]);

  // Reset when search or parent filter changes
  useEffect(() => {
    setPage(1);
    setAllItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, ...resetDeps]);

  const { data, isLoading } = useListHook(
    {
      search: search || undefined,
      perpage,
      page,
    },
    { enabled },
  );

  // Append new page data
  useEffect(() => {
    const newItems = data?.data ?? [];
    if (newItems.length > 0) {
      setAllItems((prev) => (page === 1 ? newItems : [...prev, ...newItems]));
    } else if (page === 1) {
      setAllItems([]);
    }
  }, [data?.data, page]);

  const totalPages = data?.paginate?.pages ?? 1;
  const hasMore = page < totalPages;

  const items = filter ? allItems.filter(filter) : allItems;

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => p + 1);
    }
  };

  return {
    items,
    isLoading: isLoading && page === 1,
    isLoadingMore: isLoading && page > 1,
    hasMore,
    loadMore,
  };
}
