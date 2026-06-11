
import { useState } from "react";
import {
  Columns3,
  Download,
  Filter as FilterIcon,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreHorizontal,
  Printer,
} from "lucide-react";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useUserActivity,
  useExportUserActivity,
} from "@/hooks/use-user-activity";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useURL } from "@/hooks/use-url";
import SearchInput from "@/components/search-input";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { ActivityCardSkeletonGrid } from "@/components/loader/activity-card-skeleton";
import { useAllUsers } from "@/hooks/use-all-users";
import { getUserFullName } from "@/components/lookup/lookup-user";
import { cn } from "@/lib/utils";
import { useUserActivityTable } from "./use-user-activity-table";
import { useIsMobile } from "@/hooks/use-mobile";
import { UserActivityCard } from "./user-activity-card";
import { UserActivityDetailSheet } from "./user-activity-detail-sheet";
import { getLogCreatedAt, type ActivityLog } from "@/types/activity-log";

type DisplayMode = "list" | "grid";

const ACTION_OPTIONS = [
  { label: "Login", value: "login" },
  { label: "Logout", value: "logout" },
];

/**
 * Component หลักของหน้า User Activity รองรับ list/grid view, filter ตาม action และ user
 * @returns React element ของหน้า User Activity
 * @example
 * <UserActivityComponent />
 */
export default function UserActivityComponent() {
  const isMobile = useIsMobile();
  const [displayMode, setDisplayMode] = useState<DisplayMode>("list");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const { params, search, setSearch, tableConfig } = useDataGridState({
    defaultSort: "-created_at",
  });
  const [actionFilter, setActionFilter] = useURL("action");
  const [actorFilter, setActorFilter] = useURL("actor_id");
  const { data: allUsers = [] } = useAllUsers();
  const { exportUserActivity, isExporting } = useExportUserActivity();
  const t = useTranslations("systemAdmin.userActivity");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const userOptions = allUsers.map((u) => ({
    label: getUserFullName(u),
    value: u.user_id,
  }));

  const queryParams = (() => {
    const p = { ...params } as Record<string, unknown>;
    // Use entity_type=auth to get only login/logout records
    p.entity_type = "auth";
    // If user picks a specific action (login OR logout), send single value
    if (actionFilter && !actionFilter.includes(",")) {
      p.action = actionFilter;
    }
    if (actorFilter) p.actor_id = actorFilter;
    return p;
  })();

  const useInfiniteScroll = isMobile || displayMode === "grid";

  const { data, isLoading, error, refetch } = useUserActivity(queryParams, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<ActivityLog>({
    useListHook: useUserActivity,
    params: queryParams,
    enabled: useInfiniteScroll,
  });

  const logs = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const activeFilters: ActiveFilter[] = [];
  if (actionFilter) {
    for (const v of actionFilter.split(",")) {
      const match = ACTION_OPTIONS.find((o) => o.value === v);
      if (match) {
        activeFilters.push({
          key: `action:${v}`,
          label: match.label,
          onRemove: () => {
            const next = actionFilter
              .split(",")
              .filter((val) => val !== v)
              .join(",");
            setActionFilter(next);
          },
        });
      }
    }
  }
  if (actorFilter) {
    for (const v of actorFilter.split(",")) {
      const match = userOptions.find((o) => o.value === v);
      if (match) {
        activeFilters.push({
          key: `actor:${v}`,
          label: match.label,
          onRemove: () => {
            const next = actorFilter
              .split(",")
              .filter((val) => val !== v)
              .join(",");
            setActorFilter(next);
          },
        });
      }
    }
  }

  const clearAllFilters = () => {
    setActionFilter("");
    setActorFilter("");
  };

  const handleExport = async () => {
    try {
      const count = await exportUserActivity({
        params: queryParams,
        columns: [
          { header: tfl("date"), value: (r) => getLogCreatedAt(r), width: 18 },
          { header: tfl("action"), value: (r) => r.action, width: 12 },
          {
            header: tfl("user"),
            value: (r) =>
              [r.actor_firstname, r.actor_middlename, r.actor_lastname]
                .filter(Boolean)
                .join(" ") || (r.actor_username ?? ""),
            width: 24,
          },
          {
            header: tfl("ipAddress"),
            value: (r) => r.ip_address ?? "",
            width: 16,
          },
          {
            header: tfl("description"),
            value: (r) => r.description ?? "",
            width: 40,
          },
        ],
      });
      if (count === 0) {
        toast.warning(tc("exportNoData"));
        return;
      }
      toast.success(tc("exportSuccess", { count }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tc("exportFailed"));
    }
  };

  const table = useUserActivityTable({
    logs,
    totalRecords,
    params,
    tableConfig,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ModuleTileIcon />
            <h1 className="text-lg font-semibold">{t("title")}</h1>
            {totalRecords > 0 && (
              <Badge variant="secondary" size="sm" className="tabular-nums text-xs">
                {totalRecords.toLocaleString()}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{t("desc")}</p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={isExporting}
            className="hidden sm:inline-flex"
          >
            {isExporting ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Download aria-hidden="true" />
            )}
            {isExporting ? tc("exporting") : tc("export")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => globalThis.print()}
            className="hidden sm:inline-flex"
          >
            <Printer aria-hidden="true" />
            {tc("print")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="ml-auto h-11 w-11 shrink-0 sm:hidden"
                aria-label={tc("aria.moreActions")}
              >
                <MoreHorizontal aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Download aria-hidden="true" />
                )}
                {isExporting ? tc("exporting") : tc("export")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => globalThis.print()}>
                <Printer aria-hidden="true" />
                {tc("print")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
          <div className="flex-1 sm:flex-initial">
            <SearchInput defaultValue={search} onSearch={setSearch} />
          </div>
          <span className="bg-border hidden h-4 w-px sm:block" />
          <div className="hidden sm:flex sm:items-center sm:gap-2">
            <MultiSelectFilter
              value={actionFilter}
              onChange={setActionFilter}
              placeholder={t("action")}
              options={ACTION_OPTIONS}
            />
            <MultiSelectFilter
              value={actorFilter}
              onChange={setActorFilter}
              placeholder={t("user")}
              options={userOptions}
              searchable
              searchPlaceholder={t("searchUser")}
            />
          </div>
          <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="relative h-11 w-11 shrink-0 sm:hidden"
                aria-label={tc("aria.openFilters")}
              >
                <FilterIcon aria-hidden="true" />
                {activeFilters.length > 0 && (
                  <Badge
                    variant="secondary"
                    size="xs"
                    className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[0.625rem] tabular-nums"
                  >
                    {activeFilters.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[80vh]">
              <SheetHeader>
                <SheetTitle>{tc("filter")}</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-3 p-4">
                <MultiSelectFilter
                  value={actionFilter}
                  onChange={setActionFilter}
                  placeholder={t("action")}
                  options={ACTION_OPTIONS}
                />
                <MultiSelectFilter
                  value={actorFilter}
                  onChange={setActorFilter}
                  placeholder={t("user")}
                  options={userOptions}
                  searchable
                  searchPlaceholder={t("searchUser")}
                />
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => setFilterSheetOpen(false)}
                >
                  {tc("done")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {displayMode === "list" && (
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label={tc("aria.toggleColumns")}
                >
                  <Columns3 className="size-4" />
                </Button>
              }
            />
          )}
          <div className="flex items-center rounded-md border">
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
      </div>

      {/* Active filter badges */}
      <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
      </div>

      <div className="mt-3 space-y-3">
      {/* Content */}
      {!isMobile && displayMode === "list" && (
        <DataGrid
          table={table}
          recordCount={totalRecords}
          isLoading={isLoading}
          tableLayout={{ headerSticky: true }}
          emptyMessage={<EmptyComponent />}
          onRowClick={setSelectedLog}
        >
          <DataGridContainer
            className={cn(
              "flex flex-col",
              activeFilters.length > 0
                ? "max-h-[calc(100vh-13rem-3rem)]"
                : "max-h-[calc(100vh-10rem-3rem)]",
            )}
          >
            <div className="flex-1 overflow-auto">
              <DataGridTable />
            </div>
            <DataGridPagination />
          </DataGridContainer>
        </DataGrid>
      )}

      {useInfiniteScroll &&
        (grid.isLoading ? (
          <ActivityCardSkeletonGrid />
        ) : logs.length === 0 ? (
          <EmptyComponent />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {logs.map((log, i) => (
                <UserActivityCard
                  key={log.id}
                  log={log}
                  index={i}
                  onClick={() => setSelectedLog(log)}
                />
              ))}
            </div>
            {grid.hasMore && (
              <div ref={grid.sentinelRef} className="flex justify-center py-4">
                {grid.isLoadingMore && (
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                )}
              </div>
            )}
          </>
        ))}
      </div>

      {/* Detail Sheet */}
      <UserActivityDetailSheet
        log={selectedLog}
        open={!!selectedLog}
        onOpenChange={(open) => {
          if (!open) setSelectedLog(null);
        }}
      />
    </div>
  );
}
