
import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useListPageState } from "@/hooks/use-list-page-state";
import type { ParamsDto } from "@/types/params";

interface UseDataGridStateOptions {
  defaultPerpage?: number;
  defaultPage?: number;
  defaultSort?: string;
}

/**
 * Hook รวม state ของ DataGrid (pagination/sorting/filter/search) โดย sync กับ URL ผ่าน useListPageState
 * รวม filter/stage/userId เข้าด้วยกันด้วย ";" และแปลง sort string "field:asc" เป็น SortingState
 * เมื่อเปลี่ยน sort จะ reset page กลับไป 1 โดยอัตโนมัติ
 * @param options - ตัวเลือก defaultPerpage, defaultPage, defaultSort (เช่น "code:asc")
 * @returns object ของ params (ParamsDto), tableState และ tableConfig สำหรับส่งให้ TanStack Table
 * @example
 * const { params, tableConfig, search, setSearch } = useDataGridState({ defaultSort: "created_at:desc" });
 * const { data } = useEntity(params);
 */
export function useDataGridState(options?: UseDataGridStateOptions) {
  const {
    pageNumber,
    perpageNumber,
    sort,
    setSort,
    search,
    setSearch,
    filter,
    setFilter,
    stage,
    setStage,
    userId,
    setUserId,
    handlePageChange,
    handleSetPerpage,
  } = useListPageState(options);

  const effectiveSort = sort || options?.defaultSort || "";

  const sorting: SortingState = (() => {
    if (!effectiveSort) return [];
    const [id, dir] = effectiveSort.split(":");
    return [{ id, desc: dir === "desc" }];
  })();

  const pagination: PaginationState = { pageIndex: pageNumber - 1, pageSize: perpageNumber };

  const combinedFilter =
    [filter, stage, userId]
      .filter(Boolean)
      .join(";") || undefined;

  const params: ParamsDto = {
    page: pageNumber,
    perpage: perpageNumber,
    sort: effectiveSort || undefined,
    search: search || undefined,
    filter: combinedFilter,
  };

  const onPaginationChange = (
    updater: PaginationState | ((old: PaginationState) => PaginationState),
  ) => {
    const next =
      typeof updater === "function" ? updater(pagination) : updater;
    handlePageChange(next.pageIndex + 1);
    handleSetPerpage(next.pageSize);
  };

  const onSortingChange = (
    updater: SortingState | ((old: SortingState) => SortingState),
  ) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    if (next.length > 0) {
      setSort(`${next[0].id}:${next[0].desc ? "desc" : "asc"}`);
    } else if (options?.defaultSort) {
      // TanStack ขอ removal (คลิกครั้งที่ 3 ของ column) — เมื่อมี default sort เรา
      // ไม่ต้องการ state "ไม่เรียง" จึงพลิกทิศจาก sort ปัจจุบันแทน เพื่อให้คลิกสลับ
      // asc↔desc ได้ตลอด (ถ้าพลิกจากทิศ default คงที่ จะค้างเมื่อ default เป็น asc)
      const current = sorting[0];
      if (current) {
        setSort(`${current.id}:${current.desc ? "asc" : "desc"}`);
      } else {
        setSort(options.defaultSort);
      }
    } else {
      setSort("");
    }
    handlePageChange(1);
  };

  return {
    params,
    search,
    setSearch,
    filter,
    setFilter,
    stage,
    setStage,
    userId,
    setUserId,
    tableState: { pagination, sorting },
    tableConfig: {
      manualPagination: true as const,
      manualSorting: true as const,
      pageCount: 0,
      state: { pagination, sorting },
      onPaginationChange,
      onSortingChange,
    },
  };
}
