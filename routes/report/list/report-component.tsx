
import * as React from "react";
import { useState } from "react";
import { Filter as FilterIcon } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTranslations } from "use-intl";
import SearchInput from "@/components/search-input";
import { Badge } from "@/components/ui/badge";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import EmptyComponent from "@/components/empty-component";
import { ErrorState } from "@/components/ui/error-state";
import type { Report, ReportTemplate } from "@/types/report";
import { useReportTemplates, useRunReportMutation } from "@/hooks/use-report";
import { useReportTable } from "./use-report-table";
import { ReportParamDialog } from "./report-param-dialog";
import ReportCard from "./report-card";
import { ReportGroupFilter } from "./report-group-filter";

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
  };
};

export default function ReportComponent() {
  const t = useTranslations("report");
  const isMobile = useIsMobile();
  const buCode = useBuCode();
  const [search, setSearch] = useURL("search");
  const [groupsRaw, setGroupsRaw] = useURL("groups");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const { params, tableConfig } = useDataGridState({ defaultPerpage: 10 });

  const groupFilter = groupsRaw ? groupsRaw.split(",").filter(Boolean) : [];
  const setGroupFilter = (values: string[]) => setGroupsRaw(values.join(","));

  // Server-side pagination — ส่ง page/perpage/search ไป BE
  const queryParams = { ...params, search: search || undefined };
  const templatesQuery = useReportTemplates(queryParams);
  const runReport = useRunReportMutation();

  const reports = (templatesQuery.data?.data ?? []).map(templateToReport);
  const totalRecords = templatesQuery.data?.paginate?.total ?? 0;
  const pageCount = templatesQuery.data?.paginate?.pages ?? 0;

  const reportGroups = [...new Set(reports.map((r) => r.ReportGroup))];

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
      const { url } = await runReport.mutateAsync({
        template_id: report._templateId ?? "",
        filters,
      });
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
    } catch (err) {
      viewerWindow?.close();
      toast.error(t("runError"), {
        id: toastId,
        description: err instanceof Error ? err.message : undefined,
      });
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
          <DocumentListHeader
            title={t("title")}
            description={t("desc")}
            count={filteredReports.length}
          />

          {/* Toolbar */}
          <div className="flex w-full items-center gap-2">
            <div className="flex-1">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <span className="bg-border hidden h-4 w-px sm:block" />
            <div className="hidden sm:block">
              <ReportGroupFilter
                value={groupFilter}
                onChange={setGroupFilter}
                groups={reportGroups}
                allTypesLabel={t("allTypes")}
                noTypesFoundLabel={t("noTypesFound")}
              />
            </div>
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
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="sm:hidden"
                  aria-label={t("openFilters")}
                >
                  <FilterIcon aria-hidden="true" />
                  {groupFilter.length > 0 && (
                    <Badge
                      variant="secondary"
                      size="xs"
                      className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[0.625rem] tabular-nums"
                    >
                      {groupFilter.length}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[80dvh]">
                <SheetHeader>
                  <SheetTitle>{t("allTypes")}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3 p-4">
                  <ReportGroupFilter
                    value={groupFilter}
                    onChange={setGroupFilter}
                    groups={reportGroups}
                    allTypesLabel={t("allTypes")}
                    noTypesFoundLabel={t("noTypesFound")}
                  />
                  <Button
                    variant="outline"
                    className="h-11 w-full"
                    onClick={() => setFilterSheetOpen(false)}
                  >
                    {t("done")}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
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
    </>
  );
}
