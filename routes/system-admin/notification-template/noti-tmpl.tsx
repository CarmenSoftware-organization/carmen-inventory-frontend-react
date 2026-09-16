import { Link } from "react-router";
import { useTranslations } from "use-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { ErrorState } from "@/components/ui/error-state";
import SearchInput from "@/components/search-input";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useNotificationTemplates } from "@/hooks/use-notification-template";
import { useNotiTmplTable } from "./use-noti-tmpl-table";
import { DocumentListHeader } from "@/components/share/document-list-header";

const LIST_PATH = "/system-admin/notification-template";

/**
 * การแจ้งเตือนในแอปเป็นช่องทางเดียวที่ระบบส่งจริง
 *
 * DB ยังมีเทมเพลตของ email/line/sms จาก seed ชุดเก่าอยู่ 60 รายการ (ไม่มีอะไรส่ง
 * มันแล้ว) — กรองทิ้งที่ระดับ query ไม่ใช่ที่ระดับแถว เพื่อให้ทั้งตัวนับ, การแบ่งหน้า
 * และการค้นหานับจากชุดเดียวกัน · ไม่ลบข้อมูลเพราะเป็นการตัดสินใจฝั่งหลังบ้าน
 */
const APP_CHANNEL_ONLY = "type:app";

export default function NotificationTemplateComponent() {
  const t = useTranslations("systemAdmin.notificationTemplate");
  const { params, search, setSearch, tableConfig } = useDataGridState({
    defaultSort: "name:asc",
  });

  const listParams = { ...params, filter: APP_CHANNEL_ONLY };
  const { data, isLoading, error, refetch } =
    useNotificationTemplates(listParams);
  const items = data?.data ?? [];
  const totalRecords = data?.paginate.total ?? 0;

  const table = useNotiTmplTable({
    data: items,
    totalRecords,
    params: listParams,
    tableConfig,
  });

  if (error) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <DocumentListHeader
          title={t("title")}
          description={t("desc")}
          count={totalRecords}
        />
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
