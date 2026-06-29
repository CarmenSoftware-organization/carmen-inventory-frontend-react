
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { ErrorState } from "@/components/ui/error-state";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import SearchInput from "@/components/search-input";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useNotificationTemplates } from "@/hooks/use-notification-template";
import { useNotiTmplTable } from "./use-noti-tmpl-table";

const LIST_PATH = "/system-admin/notification-template";

export default function NotificationTemplateComponent() {
  const t = useTranslations("systemAdmin.notificationTemplate");
  const { params, search, setSearch, tableConfig } = useDataGridState({
    defaultSort: "name:asc",
  });

  const { data, isLoading, error, refetch } = useNotificationTemplates(params);
  const items = data?.data ?? [];
  const totalRecords = data?.paginate.total ?? 0;

  const table = useNotiTmplTable({
    data: items,
    totalRecords,
    params,
    tableConfig,
  });

  if (error) {
    return <ErrorState message={error.message} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ModuleTileIcon />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{t("title")}</h1>
              {totalRecords > 0 && (
                <Badge variant="secondary" size="sm" className="tabular-nums">
                  {totalRecords.toLocaleString()}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm">{t("desc")}</p>
          </div>
        </div>
        <Button asChild size="sm">
          <Link to={`${LIST_PATH}/new`}>
            <Plus aria-hidden />
            {t("add")}
          </Link>
        </Button>
      </div>

      <SearchInput defaultValue={search} onSearch={setSearch} />

      <DataGrid
        table={table}
        recordCount={totalRecords}
        isLoading={isLoading}
        tableLayout={{ headerSticky: true }}
      >
        <DataGridContainer>
          <DataGridTable />
          <DataGridPagination />
        </DataGridContainer>
      </DataGrid>
    </div>
  );
}
