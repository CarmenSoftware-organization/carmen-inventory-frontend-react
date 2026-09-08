import { useMemo, useState } from "react";
import { useTranslations } from "use-intl";
import { LayoutGrid, LayoutList, Loader2 } from "lucide-react";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";
import { useHistoryTable } from "./use-history-table";
import { useReportHistory } from "./use-report-history";
import type { ReportHistory } from "@/types/report-history";
import HistoryCard from "./history-card";
import { DocumentListHeader } from "@/components/share/document-list-header";

export default function HistoryComponent() {
  const t = useTranslations("reportHistory");
  const tc = useTranslations("common");
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const isMobile = useIsMobile();
  const { params, search, setSearch, tableConfig } = useDataGridState();

  const isGridMode = isMobile || displayMode === "grid";

  // List mode → standard paginated query
  const listQuery = useReportHistory(params, { enabled: !isGridMode });

  // Grid mode → infinite scroll (accumulates pages)
  const grid = useGridPagination<ReportHistory>({
    useListHook: useReportHistory,
    params,
    enabled: isGridMode,
  });

  // TanStack ต้องได้ reference ที่นิ่ง — สาขา list สร้าง array ใหม่ทุก render
  // แล้ว useReactTable จะ sync state ไม่จบ (เจอจริงที่ vendor-certificate-section)
  const items = useMemo(
    () => (isGridMode ? grid.items : (listQuery.data?.data ?? [])),
    [isGridMode, grid.items, listQuery.data],
  );
  const totalRecords = isGridMode
    ? grid.totalRecords
    : (listQuery.data?.paginate?.total ?? 0);
  const pageCount = listQuery.data?.paginate?.pages ?? 0;
  const isLoading = isGridMode ? grid.isLoading : listQuery.isLoading;

  const columns = useHistoryTable();
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount,
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <DocumentListHeader
        title={t("title")}
        description={t("desc")}
        count={totalRecords}
      />

      {/* Toolbar — search + display toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="w-full flex-1 sm:w-auto sm:flex-initial">
          <SearchInput defaultValue={search} onSearch={setSearch} />
        </div>
        <div className="hidden items-center rounded-md border sm:flex">
          <Button
            size="icon-sm"
            variant={displayMode === "list" ? "secondary" : "ghost"}
            onClick={() => setDisplayMode("list")}
            aria-label={tc("aria.listView")}
          >
            <LayoutList className="size-4" />
          </Button>
          <Button
            size="icon-sm"
            variant={displayMode === "grid" ? "secondary" : "ghost"}
            onClick={() => setDisplayMode("grid")}
            aria-label={tc("aria.gridView")}
          >
            <LayoutGrid className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      {isGridMode ? (
        <GridContent
          items={items}
          isLoading={isLoading}
          isLoadingMore={grid.isLoadingMore}
          hasMore={grid.hasMore}
          sentinelRef={grid.sentinelRef}
          totalRecords={totalRecords}
        />
      ) : (
        <DataGrid
          table={table}
          recordCount={totalRecords}
          isLoading={isLoading}
          tableLayout={{ headerSticky: true }}
          emptyMessage={<EmptyComponent />}
        >
          <DataGridContainer className="flex max-h-[calc(100vh-13rem-3rem)] flex-col">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
            <DataGridPagination />
          </DataGridContainer>
        </DataGrid>
      )}
    </div>
  );
}

interface GridContentProps {
  readonly items: ReportHistory[];
  readonly isLoading: boolean;
  readonly isLoadingMore: boolean;
  readonly hasMore: boolean;
  readonly sentinelRef: (node: HTMLDivElement | null) => void;
  readonly totalRecords: number;
}

function GridContent({
  items,
  isLoading,
  isLoadingMore,
  hasMore,
  sentinelRef,
  totalRecords,
}: GridContentProps) {
  const t = useTranslations("reportHistory");
  if (isLoading && items.length === 0) {
    return <CardSkeletonGrid count={6} />;
  }
  if (totalRecords === 0) {
    return <EmptyComponent />;
  }
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => (
          <HistoryCard key={item.job_id} item={item} />
        ))}
      </div>

      {/* Sentinel for infinite scroll — also visible as fallback area
          (when content fits viewport, sentinel stays visible but observer
          won't re-trigger; user scroll past it to load more) */}
      {hasMore && (
        <div
          ref={sentinelRef}
          className="flex items-center justify-center py-6"
        >
          {isLoadingMore ? (
            <div className="text-muted-foreground inline-flex items-center gap-2 text-xs">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>{t("loadingMore")}</span>
            </div>
          ) : (
            <span className="text-muted-foreground/60 text-micro">
              {t("scrollToLoadMore")}
            </span>
          )}
        </div>
      )}
    </>
  );
}
