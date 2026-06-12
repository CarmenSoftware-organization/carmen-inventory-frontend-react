
import { useState } from "react";
import { useRouter } from "@/lib/compat/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRole, useDeleteRole } from "@/hooks/use-role";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { Loader2 } from "lucide-react";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Role } from "@/types/role";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import RoleCard from "./role-card";
import { useRoleTable } from "./use-role-table";

/**
 * คอมโพเนนต์หลักของหน้า Role list รองรับทั้ง DataGrid (desktop) และ infinite card (mobile)
 * @returns JSX element ของหน้ารายการ Role
 * @example
 * <RoleComponent />
 */
export default function RoleComponent() {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const deleteRole = useDeleteRole();
  const isMobile = useIsMobile();
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const useInfiniteScroll = !!isMobile;
  const { data, isLoading, error, refetch } = useRole(params, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<Role>({
    useListHook: useRole,
    params,
    enabled: useInfiniteScroll,
  });
  const t = useTranslations("systemAdmin.role");
  const tt = useTranslations("toast");

  const items = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const totalRecords = useInfiniteScroll
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const table = useRoleTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: (item) => router.push(`/system-admin/role/${item.id}`),
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
                <Badge
                  variant="secondary"
                  size="sm"
                  className="text-xs tabular-nums"
                >
                  {totalRecords.toLocaleString()}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{t("desc")}</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              size="sm"
              onClick={() => router.push("/system-admin/role/new")}
            >
              <Plus aria-hidden="true" />
              {t("add")}
            </Button>
          </div>
        </div>

        <div className="flex w-full items-center gap-2">
          <div className="flex-1">
            <SearchInput defaultValue={search} onSearch={setSearch} />
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {isMobile ? (
          grid.isLoading ? (
            <CardSkeletonGrid />
          ) : items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3">
                {items.map((item, i) => (
                  <RoleCard
                    key={item.id}
                    item={item}
                    index={i}
                    onEdit={(r) => router.push(`/system-admin/role/${r.id}`)}
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
            <DataGridContainer className="flex max-h-[calc(100vh-10rem-3rem)] flex-col">
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
          !open && !deleteRole.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={deleteRole.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteRole.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success(tt("deleteSuccess", { entity: t("entity") }));
              setDeleteTarget(null);
            },
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
