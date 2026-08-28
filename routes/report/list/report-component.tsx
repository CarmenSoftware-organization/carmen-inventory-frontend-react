import * as React from "react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useURL } from "@/hooks/use-url";
import { useBuCode } from "@/hooks/use-bu-code";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { LayoutGrid, LayoutList } from "lucide-react";
import { useTranslations } from "use-intl";
import SearchInput from "@/components/search-input";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import EmptyComponent from "@/components/empty-component";
import { ErrorState } from "@/components/ui/error-state";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import type { Report, ReportTemplate } from "@/types/report";
import { useReportTemplates, useRunReportMutation } from "../shared/use-report";
import { useReportTable } from "./use-report-table";
import { safeNavigationHref } from "@/lib/utils";
import { ReportParamDialog } from "./report-param-dialog";
import ReportCard from "./report-card";
import { ReportGroupFilter } from "./report-group-filter";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilter } from "@/components/list-filter/list-filter";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

const templateToReport = (t: ReportTemplate): Report => {
  return {
    Id: 0,
    PermissionName: "",
    ReportGroup: t.report_group,
    ReportName: t.name,
    Description: t.description ?? "",
    Dialog: t.dialog,
    IsSystem: t.is_standard,
    UserModified: "",
    LastModify: "",
    _templateId: t.id,
    _content: t.content,
    _columns: t.columns ?? [],
    _templateType: t.template_type ?? "list",
  };
};

export default function ReportComponent() {
  const t = useTranslations("report");
  const isMobile = useIsMobile();
  const buCode = useBuCode();
  const [search, setSearch] = useURL("search");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const { params, tableConfig } = useDataGridState({ defaultPerpage: 10 });

  // Server-side pagination — ส่ง page/perpage/search ไป BE
  const queryParams = { ...params, search: search || undefined };
  const templatesQuery = useReportTemplates(queryParams);
  const runReport = useRunReportMutation();

  const reports = useMemo(
    () => (templatesQuery.data?.data ?? []).map(templateToReport),
    [templatesQuery.data],
  );
  const totalRecords = templatesQuery.data?.paginate?.total ?? 0;
  const pageCount = templatesQuery.data?.paginate?.pages ?? 0;

  const reportGroups = useMemo(
    () => [...new Set(reports.map((r) => r.ReportGroup))],
    [reports],
  );

  // groups เป็น client-side filter ล้วน (ไม่เคยส่งเป็น backend filter param —
  // filteredReports กรองใน browser จาก reports ของ page ปัจจุบันเท่านั้น) ค่า
  // URL เก็บเป็น CSV ของชื่อ group จริง (ไม่ใช่ "key|type:value" clause) —
  // toClause ปล่อย default (passthrough) เพราะ filterParam ไม่ถูกใช้เลย
  // ReportGroupFilter รับ/คืนค่าเป็น string[] (single-select ปัจจุบัน) จึงแปลง
  // CSV<->array ในตัว render เอง
  const reportFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "groups",
        section: "listView.sectionCategory",
        control: "custom",
        labelKey: "report.allTypes",
        render: (value, onChange) => (
          <ReportGroupFilter
            value={value ? value.split(",").filter(Boolean) : []}
            onChange={(values) => onChange(values.join(","))}
            groups={reportGroups}
            allTypesLabel={t("allTypes")}
            noTypesFoundLabel={t("noTypesFound")}
          />
        ),
      },
    ],
    [reportGroups, t],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.REPORT_LIST,
    fields: reportFilterFields,
  });

  const groupFilter = lf.values.groups
    ? lf.values.groups.split(",").filter(Boolean)
    : [];

  // BE จัดการ search แล้ว — group filter ยัง client-side
  // (filters เฉพาะ items ใน page ปัจจุบัน เพราะ BE ยังไม่รองรับ group filter)
  const filteredReports =
    groupFilter.length === 0
      ? reports
      : reports.filter((r) => new Set(groupFilter).has(r.ReportGroup));

  const handleSelect = (report: Report) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const handleRunReport = async (
    report: Report,
    filters: Record<string, string>,
  ) => {
    if (runReport.isPending) return;
    setDialogOpen(false);

    // Open blank tab synchronously to avoid popup blocker for async URL
    const viewerWindow = globalThis.window.open("about:blank", "_blank");
    const toastId = toast.loading(t("generating", { name: report.ReportName }));

    try {
      const { url: rawUrl } = await runReport.mutateAsync({
        template_id: report._templateId ?? "",
        filters,
      });
      // URL ที่ backend คืนมาไปจบที่ `location.href` ตรง ๆ — `javascript:` ที่หลุดมา
      // ทางไหนก็ตามคือ XSS ทันที ค่าที่ไม่ผ่านตกลง catch ด้านล่างเหมือน error อื่น
      const url = safeNavigationHref(rawUrl);
      if (!url)
        throw new Error(`Report viewer returned an unsafe URL: ${rawUrl}`);
      if (viewerWindow && !viewerWindow.closed) {
        viewerWindow.location.href = url;
      } else {
        globalThis.window.open(url, "_blank");
      }
      toast.success(t("ready", { name: report.ReportName }), {
        id: toastId,
        description: t("openingInNewTab"),
        action: {
          label: t("open"),
          onClick: () => globalThis.window.open(url, "_blank"),
        },
      });
    } catch {
      viewerWindow?.close();
      // ไม่ใส่ err.message ลงบรรทัดสอง — เป็นข้อความของ dev (ภาษาอังกฤษ บางที
      // เป็น stack trace ยาวเป็นสิบบรรทัด) ซึ่งเป็นกับดักเดียวกับที่
      // hooks/use-error-toast.ts ปิดไปแล้วที่ท่อกลาง หน้านี้ยิง toast เอง
      // เลยหลุดมาได้ · รายละเอียดจริงดูได้ที่ Report History
      toast.error(t("runError"), { id: toastId });
    }
  };

  const table = useReportTable({
    reports: filteredReports,
    onSelect: handleSelect,
    tableConfig,
    pageCount,
  });

  const isLoading = templatesQuery.isLoading;
  const error = templatesQuery.error ? t("loadError") : null;
  const isGridMode = isMobile || displayMode === "grid";

  return (
    <>
      <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
          {/* Header */}
          <DocumentListHeader title={t("title")} description={t("desc")} />

          {/* Toolbar */}
          <div className="flex w-full items-center gap-2">
            <div className="flex-1">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilter
              fields={reportFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
            <div className="hidden items-center rounded-md border sm:flex">
              <Button
                size="icon-sm"
                variant={displayMode === "list" ? "secondary" : "ghost"}
                onClick={() => setDisplayMode("list")}
                aria-label={t("listView")}
              >
                <LayoutList className="size-4" />
              </Button>
              <Button
                size="icon-sm"
                variant={displayMode === "grid" ? "secondary" : "ghost"}
                onClick={() => setDisplayMode("grid")}
                aria-label={t("gridView")}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>

          <ActiveFilterBar
            filters={lf.activeFilters}
            onClearAll={lf.clearAll}
          />
        </div>

        {/* Content */}
        <div className="mt-3">
          {error && (
            <ErrorState
              message={error}
              onRetry={() => templatesQuery.refetch()}
            />
          )}

          {!error && (
            <DataGrid
              table={table}
              recordCount={totalRecords}
              isLoading={isLoading}
              tableLayout={{ headerSticky: true }}
              emptyMessage={<EmptyComponent />}
            >
              <DataGridContainer className="flex max-h-[calc(100vh-13rem-3rem)] flex-col">
                <div className="flex-1 overflow-auto">
                  {isGridMode ? (
                    isLoading && filteredReports.length === 0 ? (
                      <CardSkeletonGrid count={6} />
                    ) : (
                      <div className="grid grid-cols-1 gap-3 p-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredReports.map((report) => (
                          <ReportCard
                            key={`${report.ReportGroup}-${report.ReportName}`}
                            item={report}
                            onSelect={handleSelect}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    <DataGridTable />
                  )}
                </div>
                <DataGridPagination />
              </DataGridContainer>
            </DataGrid>
          )}
        </div>
      </div>

      <ReportParamDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={selectedReport}
        buCode={buCode}
        onRun={handleRunReport}
      />

      <SaveViewDialog
        open={saveViewDialogOpen}
        onOpenChange={setSaveViewDialogOpen}
        canManageBu={lf.view.canManageBu}
        existingNames={lf.view.existingNames}
        onSave={lf.view.saveOrUpdate}
      />
    </>
  );
}
