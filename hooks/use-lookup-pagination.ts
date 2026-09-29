import { useState, useEffect } from "react";
import {
  useEntitiesByIds,
  type LookupListHook,
} from "@/hooks/use-entities-by-ids";

/** clause มาตรฐานของ lookup — ใช้ไม่ได้กับ credit-note-reasons / physical-count-periods / users */
export const ACTIVE_ONLY_FILTER = "is_active|boolean:true";

interface UseLookupPaginationOptions<T> {
  useListHook: LookupListHook<T>;
  search: string;
  perpage?: number;
  /** กรองฝั่ง client หลังโหลด — ใช้กับเงื่อนไขที่ server ทำไม่ได้เท่านั้น */
  filter?: (item: T) => boolean;
  resetDeps?: unknown[];
  /**
   * ถ้า false จะไม่ fetch รายการหน้า (lazy) — ใช้คู่กับ `onOpenChange` ของ lookup
   * การดึงรายการที่เลือกไว้ (`selectedIds`) ไม่ขึ้นกับค่านี้
   */
  enabled?: boolean;
  /**
   * id ที่เลือกอยู่ — ดึงตาม id แยกเสมอ ให้ช่องแสดงชื่อได้แม้ค่านั้นอยู่หลังหน้าแรก
   * หรือถูกปิดใช้งานไปแล้ว (เอกสารเก่า) โดยไม่ต้องรอผู้ใช้เปิด dropdown
   */
  selectedIds?: readonly string[];
  getId?: (item: T) => string;
  idFilterKey?: string;
  /** ส่งต่อเป็น `filter=` ของ API หลายเงื่อนไขคั่นด้วย `,` (AND) — เปลี่ยนแล้วเริ่มหน้า 1 ใหม่ */
  serverFilter?: string;
  sort?: string;
}

const defaultGetId = (item: unknown) => (item as { id: string }).id;

export function useLookupPagination<T>({
  useListHook,
  search,
  perpage = 30,
  filter,
  resetDeps = [],
  enabled = true,
  selectedIds,
  getId = defaultGetId,
  idFilterKey,
  serverFilter,
  sort,
}: UseLookupPaginationOptions<T>) {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState<T[]>([]);
  // จำ pages/total ล่าสุดที่เห็น — ระหว่าง fetch หน้าถัดไป `data` เป็น undefined
  // ถ้าไม่จำไว้ hasMore จะกลายเป็น false (ปุ่มโหลดเพิ่มหาย) และ total จะตกเหลือแค่ที่โหลดมา
  const [lastPaginate, setLastPaginate] = useState<{
    pages: number;
    total: number;
  } | null>(null);

  // Reset when search, server filter or parent filter changes
  useEffect(() => {
    setPage(1);
    setAllItems([]);
    setLastPaginate(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, serverFilter, sort, ...resetDeps]);

  const { data, isLoading, error, refetch } = useListHook(
    {
      search: search || undefined,
      perpage,
      page,
      filter: serverFilter,
      sort,
    },
    { enabled },
  );

  // Append new page data — รับเฉพาะ response ของหน้าที่ขออยู่ (หน้าเก่าที่ตอบช้า
  // หรือ placeholder ของหน้าก่อนจะไม่ถูกต่อซ้ำ) และตัดตัวซ้ำด้วย id
  useEffect(() => {
    if (!data) return;
    if (data.paginate?.page != null && Number(data.paginate.page) !== page)
      return;
    if (data.paginate) {
      setLastPaginate({
        pages: Number(data.paginate.pages),
        total: Number(data.paginate.total),
      });
    }
    const newItems = data.data ?? [];
    setAllItems((prev) => {
      if (page === 1) return newItems;
      // id ว่าง (entity ที่ไม่มี `id` แล้วลืมส่ง getId) ไม่นับเป็นตัวซ้ำ
      const seen = new Set<string>();
      for (const it of prev) {
        const k = getId(it);
        if (k != null) seen.add(k);
      }
      return [
        ...prev,
        ...newItems.filter((it) => {
          const k = getId(it);
          return k == null || !seen.has(k);
        }),
      ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, page]);

  const totalPages = Number(data?.paginate?.pages ?? lastPaginate?.pages ?? 1);
  // error ต้องหยุดแบ่งหน้า — ไม่งั้น auto-load ของ list จะขยับหน้าต่อไปเรื่อย ๆ โดยข้ามหน้าที่พัง
  const hasMore = page < totalPages && !error;

  const ids = selectedIds ?? [];
  const { items: fetchedSelected } = useEntitiesByIds({
    useListHook,
    ids,
    idFilterKey,
  });
  const known = new Map<string, T>();
  for (const it of allItems) known.set(getId(it), it);
  for (const it of fetchedSelected) known.set(getId(it), it);
  const selectedItems = ids
    .map((id) => known.get(id))
    .filter((it): it is T => it !== undefined);

  // ค่าที่เลือกอยู่ผ่าน filter เสมอ (เช่นถูกปิดใช้งานไปแล้วแต่เอกสารบันทึกไว้)
  const selectedSet = new Set(ids);
  const items = filter
    ? allItems.filter((it) => selectedSet.has(getId(it)) || filter(it))
    : allItems;

  // ใต้ StrictMode effect auto-load ของ VirtualCommandList รันสองรอบใน mount เดียว
  // ด้วย closure เดิม — `p + 1` เฉย ๆ จะขยับสองหน้าแล้วข้ามหน้า 2 ไป · เทียบกับ `page`
  // ของ closure ทำให้เรียกซ้ำกี่ครั้งก็ขยับได้แค่หน้าเดียว
  const loadMore = () => {
    if (hasMore && !isLoading) {
      setPage((p) => (p === page ? p + 1 : p));
    }
  };

  return {
    items,
    selectedItems,
    isLoading: isLoading && page === 1,
    isLoadingMore: isLoading && page > 1,
    hasMore,
    loadMore,
    /** จำนวนแถวที่ตรงเงื่อนไขทั้งหมดบน server (ไม่ใช่แค่ที่โหลดมาแล้ว) */
    total: Number(
      data?.paginate?.total ?? lastPaginate?.total ?? allItems.length,
    ),
    error: error ?? null,
    /** ยิงหน้าปัจจุบันซ้ำ — ใช้กับปุ่มลองใหม่ของ ErrorState */
    refetch: () => {
      void refetch?.();
    },
  };
}
