import { useURL } from "./use-url";

interface UseListPageStateOptions {
  defaultPerpage?: number;
  defaultPage?: number;
}

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

  const handleSetPerpage = (newPerpage: number) =>
    setPerpage(newPerpage.toString());

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
