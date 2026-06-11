
import { useURL } from "./use-url";

interface UseListPageStateOptions {
  defaultPerpage?: number;
  defaultPage?: number;
}

/**
 * Hook จัดการ state ของหน้า list (search, filter, sort, page, perpage ฯลฯ) ผ่าน URL query
 *
 * รวมการจัดการ URL params ทั้งหมดของ list page ไว้ในที่เดียว
 * รีเซ็ต page กลับเป็น "" (= 1) เมื่อเปลี่ยน search/filter/stage/userId
 * เพื่อไม่ให้ค้างบน page ที่ไม่มีข้อมูลแล้ว ใช้ภายใน `ConfigListTemplate`
 * และ custom list pages
 *
 * @param options - ค่าเริ่มต้นของ perpage และ page
 * @returns state และ handler สำหรับใช้ในหน้า list
 * @example
 * ```ts
 * const { search, setSearch, pageNumber, perpageNumber } = useListPageState();
 * const { data } = useVendor({ search, page: pageNumber, perpage: perpageNumber });
 * ```
 */
export function useListPageState(options: UseListPageStateOptions = {}) {
  const { defaultPerpage = 10, defaultPage = 1 } = options;

  const [search, setSearch] = useURL("search");
  const [filter, setFilter] = useURL("filter");
  const [sort, setSort] = useURL("sort");
  const [page, setPage] = useURL("page");
  const [perpage, setPerpage] = useURL("perpage");
  const [stage, setStageRaw] = useURL("workflow_current_stage");
  const [userId, setUserIdRaw] = useURL("user_id");

  const handlePageChange = (newPage: number) => setPage(newPage.toString());

  const handleSetPerpage = (newPerpage: number) => setPerpage(newPerpage.toString());

  const handleSetSearch = (value: string) => {
    setSearch(value);
    setPage("");
  };

  const handleSetFilter = (value: string) => {
    setFilter(value);
    setPage("");
  };

  const handleSetStage = (value: string) => {
    setStageRaw(value);
    setPage("");
  };

  const handleSetUserId = (value: string) => {
    setUserIdRaw(value);
    setPage("");
  };

  const pageNumber = page ? Number(page) : defaultPage;
  const perpageNumber = perpage ? Number(perpage) : defaultPerpage;

  return {
    search,
    setSearch: handleSetSearch,
    filter,
    setFilter: handleSetFilter,
    stage,
    setStage: handleSetStage,
    userId,
    setUserId: handleSetUserId,
    sort,
    setSort,
    page,
    setPage,
    perpage,
    setPerpage,
    handlePageChange,
    handleSetPerpage,
    pageNumber,
    perpageNumber,
  };
}
