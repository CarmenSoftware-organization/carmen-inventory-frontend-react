
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Download,
  Filter as FilterIcon,
  MoreHorizontal,
  Printer,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useUser, useDeleteUser } from "@/hooks/use-user";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { Loader2 } from "lucide-react";
import { useDepartment } from "@/hooks/use-department";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import UserCard from "./user-card";
import type { User } from "@/types/workflows";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import { StatusFilter } from "@/components/ui/status-filter";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { useUserTable } from "./use-user-table";

/**
 * คอมโพเนนต์หลักของหน้า User list รองรับ DataGrid (desktop), infinite card (mobile) และตัวกรองแผนก
 * @returns JSX element ของหน้ารายการผู้ใช้
 * @example
 * <UserComponent />
 */
export default function UserComponent() {
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const deleteUser = useDeleteUser();
  const isMobile = useIsMobile();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const t = useTranslations("systemAdmin.user");
  const tc = useTranslations("common");
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();

  const useInfiniteScroll = !!isMobile;
  const { data, isLoading, error, refetch } = useUser(params, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<User>({
    useListHook: useUser,
    params,
    enabled: useInfiniteScroll,
  });

  const { data: deptData } = useDepartment({ perpage: -1 });
  const deptOptions = (deptData?.data ?? [])
    .filter((d) => d.is_active)
    .map((d) => ({
      label: `${d.code} - ${d.name}`,
      value: `department_id|string:${d.id}`,
    }));

  const activeFilterTag = filter
    ? deptOptions.find((o) => o.value === filter)
    : null;

  const clearAllFilters = () => {
    setFilter("");
  };

  const activeFilters: ActiveFilter[] = activeFilterTag
    ? [
        {
          key: "filter",
          label: activeFilterTag.label,
          onRemove: () => setFilter(""),
        },
      ]
    : [];

  const users = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const table = useUserTable({
    users,
    totalRecords,
    params,
    tableConfig,
    onEdit: (user) => navigate(`/system-admin/user/${user.user_id}`),
    onDelete: setDeleteTarget,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
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
            disabled
            title={tc("comingSoon")}
            className="hidden sm:inline-flex"
          >
            <Download aria-hidden="true" />
            {tc("export")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled
            title={tc("comingSoon")}
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
              <DropdownMenuItem disabled>
                <Download aria-hidden="true" />
                {tc("export")}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Printer aria-hidden="true" />
                {tc("print")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex w-full items-center gap-2">
        <div className="flex-1">
          <SearchInput defaultValue={search} onSearch={setSearch} />
        </div>
        <span className="bg-border hidden h-4 w-px sm:block" />
        <div className="hidden sm:block">
          <StatusFilter
            value={filter}
            onChange={setFilter}
            placeholder={t("department")}
            options={deptOptions}
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
              <StatusFilter
                value={filter}
                onChange={setFilter}
                placeholder={t("department")}
                options={deptOptions}
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

      {/* Active filter badges */}
      <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
      </div>

      <div className="mt-3 space-y-3">
      {isMobile ? (
        grid.isLoading ? (
          <CardSkeletonGrid />
        ) : grid.error ? (
          <ErrorState
            message={grid.error.message}
            onRetry={() => grid.refetch?.()}
          />
        ) : users.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-3">
              {users.map((u, i) => (
                <UserCard
                  key={u.user_id}
                  item={u}
                  index={i}
                  onEdit={(user) =>
                    navigate(`/system-admin/user/${user.user_id}`)
                  }
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
        ) : (
          <EmptyComponent />
        )
      ) : (
        <DataGrid
          table={table}
          recordCount={totalRecords}
          isLoading={isLoading}
          tableLayout={{ headerSticky: true }}
          emptyMessage={<EmptyComponent />}
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

      </div>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteUser.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", {
          name: deleteTarget
            ? `${deleteTarget.firstname} ${deleteTarget.lastname}`
            : "",
        })}
        isPending={deleteUser.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteUser.mutate(deleteTarget.user_id, {
            onSuccess: () => {
              toast.success(t("deleteSuccess"));
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
