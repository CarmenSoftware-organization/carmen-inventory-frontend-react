import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Download, MoreHorizontal, Printer } from "lucide-react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser, useDeleteUser } from "@/hooks/use-user";
import { useUserRoleReport } from "./use-user-role-report";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { Loader2 } from "lucide-react";
import { useDepartment } from "@/hooks/use-department";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import UserCard from "./user-card";
import type { User } from "@/types/workflows";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { StatusFilter } from "@/components/ui/status-filter";
import { cn } from "@/lib/utils";
import { useUserTable } from "./use-user-table";
import { useListFilters } from "@/hooks/use-list-filters";
import { ListToolbar } from "@/components/list-filter/list-toolbar";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { DocumentListHeader } from "@/components/share/document-list-header";

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
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const t = useTranslations("systemAdmin.user");
  const tc = useTranslations("common");
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const { printReport, exportCsv, isBusy } = useUserRoleReport();

  const { data: deptData } = useDepartment({ perpage: -1 });
  // department เป็นชื่อ literal string จริง (ไม่ใช่ i18n key) — memo กันไม่ให้
  // array reference เปลี่ยนทุก render จน userFilterFields memo ข้างล่างไม่เคย hit
  const deptOptions = useMemo(
    () =>
      (deptData?.data ?? [])
        .filter((d) => d.is_active)
        .map((d) => ({
          label: `${d.code} - ${d.name}`,
          value: `department_id|string:${d.id}`,
        })),
    [deptData],
  );

  // filter (department) เป็น single-select (StatusFilter ไม่ใช่ MultiSelectFilter)
  // เหมือนโค้ดเดิมทุกประการ — label เป็น literal string จริงจึงต้องใช้
  // control: "custom" ห่อ StatusFilter ตรง ๆ แทน control: "status" ทั่วไป (ตัวนั้น
  // เรียก t(option.labelKey) ซึ่งจะ error ถ้า label ไม่ใช่ i18n key)
  const userFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "filter",
        section: "listView.sectionDocument",
        control: "custom",
        labelKey: "systemAdmin.user.department",
        render: (value, onChange) => (
          <StatusFilter
            value={value}
            onChange={onChange}
            placeholder={t("department")}
            options={deptOptions}
            className="w-full"
          />
        ),
      },
    ],
    [deptOptions, t],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.USER,
    fields: userFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

  const useInfiniteScroll = !!isMobile;
  const { data, isLoading, error, refetch } = useUser(combinedParams, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<User>({
    useListHook: useUser,
    params: combinedParams,
    enabled: useInfiniteScroll,
  });

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

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader
            title={t("title")}
            description={t("desc")}
            count={totalRecords}
          />
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={exportCsv}
              disabled={isBusy}
              className="hidden sm:inline-flex"
            >
              {isBusy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Download aria-hidden="true" />
              )}
              {tc("export")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={printReport}
              disabled={isBusy}
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
                <DropdownMenuItem onClick={exportCsv} disabled={isBusy}>
                  <Download aria-hidden="true" />
                  {tc("export")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={printReport} disabled={isBusy}>
                  <Printer aria-hidden="true" />
                  {tc("print")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ListToolbar
          variant="row"
          search={search}
          onSearch={setSearch}
          lf={lf}
          fields={userFilterFields}
          onSaveViewClick={() => setSaveViewDialogOpen(true)}
        />
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
                {users.map((u) => (
                  <UserCard
                    key={u.user_id}
                    item={u}
                    onEdit={(user) =>
                      navigate(`/system-admin/user/${user.user_id}`)
                    }
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
              {grid.hasMore && (
                <div
                  ref={grid.sentinelRef}
                  className="flex justify-center py-4"
                >
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
                lf.activeFilters.length > 0
                  ? "max-h-[calc(100vh-13rem-3rem)]"
                  : "max-h-[calc(100vh-10rem-3rem)]",
              )}
            >
              <DataGridScrollArea>
                <DataGridTable />
              </DataGridScrollArea>
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
          });
        }}
      />

      <SaveViewDialog
        open={saveViewDialogOpen}
        onOpenChange={setSaveViewDialogOpen}
        canManageBu={lf.view.canManageBu}
        existingNames={lf.view.existingNames}
        onSave={lf.view.saveOrUpdate}
      />
    </div>
  );
}
