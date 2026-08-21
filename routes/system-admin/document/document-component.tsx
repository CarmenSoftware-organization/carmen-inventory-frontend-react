import { useEffect, useMemo, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useDocument,
  useDocumentSummary,
  useUploadDocument,
  useDeleteDocument,
} from "@/hooks/use-document";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import DocumentCard from "./document-card";
import DocumentSummaryBar from "./document-summary-bar";
import DocumentSummarySheet from "./document-summary-sheet";
import type { DocumentFile } from "@/types/document";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { useDocumentTable } from "./use-document-table";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilter } from "@/components/list-filter/list-filter";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

type FileTypeKey = "pdf" | "xls" | "doc" | "image" | "txt" | "archive" | "code";

const FILE_TYPE_MATCHERS: Record<FileTypeKey, (ct: string) => boolean> = {
  pdf: (ct) => ct.includes("pdf"),
  xls: (ct) =>
    ct.includes("spreadsheet") || ct.includes("excel") || ct.includes("csv"),
  doc: (ct) => ct.includes("word") || ct.includes("document"),
  image: (ct) => ct.includes("image"),
  txt: (ct) => ct.includes("text/plain"),
  archive: (ct) =>
    ct.includes("zip") || ct.includes("rar") || ct.includes("compressed"),
  code: (ct) =>
    ct.includes("json") || ct.includes("xml") || ct.includes("html"),
};

const TYPE_OPTIONS: { label: string; value: FileTypeKey }[] = [
  { label: "PDF", value: "pdf" },
  { label: "Excel / CSV", value: "xls" },
  { label: "Word", value: "doc" },
  { label: "Image", value: "image" },
  { label: "Text", value: "txt" },
  { label: "Archive", value: "archive" },
  { label: "Code", value: "code" },
];

/**
 * Component หลักของหน้าเอกสาร (Document) รองรับ upload, delete และ filter ประเภทไฟล์
 * @returns React element ของหน้า Document
 * @example
 * <DocumentComponent />
 */
export default function DocumentComponent() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentFile | null>(null);
  const deleteDocument = useDeleteDocument();
  const uploadDocument = useUploadDocument();
  const isMobile = useIsMobile();
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [summarySheetOpen, setSummarySheetOpen] = useState(false);
  const { data: summary, isLoading: isSummaryLoading } = useDocumentSummary();
  const hasSummary = !!summary && summary.total_count > 0;
  // ช่องแถบสรุปถือว่า "มีของ" ตั้งแต่ตอนโหลด (มี skeleton แสดงอยู่) ไม่ใช่แค่ตอนมีข้อมูลจริง
  // ใช้ค่านี้กับ max-h ของตารางเท่านั้น ส่วน Sheet ยังต้องใช้ hasSummary เพราะต้องการข้อมูลจริง
  const summarySlotVisible = hasSummary || isSummaryLoading;

  // สลับ BU แล้ว summary หายไปกลางอากาศ (query key เปลี่ยน) ทำให้ Sheet unmount โดยไม่เคยเรียก
  // onOpenChange(false) — ถ้าไม่รีเซ็ตตรงนี้ summarySheetOpen จะค้างเป็น true แล้วพอสลับไป BU
  // ที่มีไฟล์ Sheet จะเด้งเปิดเองโดยไม่มีใครกด
  useEffect(() => {
    if (!hasSummary) setSummarySheetOpen(false);
  }, [hasSummary]);
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const useInfiniteScroll = !!isMobile;
  const { data, isLoading, error, refetch } = useDocument(params, {
    enabled: !useInfiniteScroll,
  });

  const grid = useGridPagination<DocumentFile>({
    useListHook: useDocument as Parameters<
      typeof useGridPagination<DocumentFile>
    >[0]["useListHook"],
    params,
    enabled: useInfiniteScroll,
  });
  const t = useTranslations("systemAdmin.document");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");

  // type เป็น literal string จริง (ไม่ใช่ i18n key) จึงต้องใช้ control: "custom"
  // ห่อ MultiSelectFilter ตรง ๆ แทน control: "multi-select" ทั่วไป — เหมือน
  // pattern ของ PO_TYPE/CN_TYPE ใน Task 19 ค่า `type` ถูกใช้ client-side ล้วน
  // (กรอง allDocuments ในเบราว์เซอร์ ไม่เคยส่งเป็น backend filter param) —
  // toClause ปล่อย default (passthrough) เพราะ filterParam ไม่ถูกใช้เลย
  const documentFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "type",
        section: "listView.sectionDocument",
        control: "custom",
        labelKey: "field.type",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            placeholder={tfl("type")}
            options={TYPE_OPTIONS}
            searchable
            searchPlaceholder={t("searchType")}
            className="w-full"
          />
        ),
      },
    ],
    [t, tfl],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.DOCUMENT,
    fields: documentFilterFields,
  });

  const typeFilter = lf.values.type;
  const selectedTypes = new Set(typeFilter ? typeFilter.split(",") : []);

  const allDocuments = useInfiniteScroll ? grid.items : (data?.data ?? []);
  const documents =
    selectedTypes.size === 0
      ? allDocuments
      : allDocuments.filter((doc) =>
          Array.from(selectedTypes).some((key) =>
            FILE_TYPE_MATCHERS[key as FileTypeKey]?.(doc.contentType),
          ),
        );
  const totalRecords =
    selectedTypes.size === 0
      ? useInfiniteScroll
        ? grid.totalRecords
        : (data?.paginate?.total ?? 0)
      : documents.length;

  const table = useDocumentTable({
    documents,
    totalRecords,
    params,
    tableConfig,
    onDelete: setDeleteTarget,
  });

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.warning(t("fileSizeLimit"));
      e.target.value = "";
      return;
    }
    uploadDocument.mutate(file, {
      onSuccess: () => toast.success(t("uploadSuccess")),
    });
    e.target.value = "";
  };

  if (error) return <ErrorState error={error} onRetry={() => refetch()} />;

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
          <div className="flex w-full items-center gap-2 *:flex-1 sm:w-auto sm:*:flex-initial">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.handleUpload,.docx,.xls,.xlsx,.csv,.txt"
              onChange={handleUpload}
              className="hidden"
            />
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadDocument.isPending}
            >
              <Upload />
              {uploadDocument.isPending ? t("uploading") : t("upload")}
            </Button>
          </div>
        </div>

        <DocumentSummaryBar
          summary={summary}
          isLoading={isSummaryLoading}
          onViewAll={() => setSummarySheetOpen(true)}
        />

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
            fields={documentFilterFields}
            values={lf.values}
            setValue={lf.setValue}
            onClearAll={lf.clearAll}
            onSaveClick={() => setSaveViewDialogOpen(true)}
            activeCount={lf.activeFilters.length}
          />
        </div>

        {/* Active filter badges */}
        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
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
          ) : documents.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-3">
                {documents.map((doc, i) => (
                  <DocumentCard key={doc.fileToken} item={doc} index={i} />
                ))}
              </div>
              {grid.hasMore && selectedTypes.size === 0 && (
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
                // แถบสรุปสูงประมาณ 4rem รวมช่องไฟ (ทั้ง skeleton ตอนโหลดและแถบจริง) — สี่เคส
                // ตามว่าช่องแถบสรุปมีของ (summarySlotVisible: กำลังโหลดหรือมีข้อมูลแล้ว) และมี
                // active filter หรือไม่ ใช้ summarySlotVisible ไม่ใช่ hasSummary เพราะถ้ารอข้อมูล
                // จริงก่อนค่อยเผื่อพื้นที่ ตารางจะกระตุกตอน skeleton สลับเป็นแถบจริง
                summarySlotVisible
                  ? lf.activeFilters.length > 0
                    ? "max-h-[calc(100vh-17rem-3rem)]"
                    : "max-h-[calc(100vh-14rem-3rem)]"
                  : lf.activeFilters.length > 0
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
          !open && !deleteDocument.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", {
          name: deleteTarget?.originalName ?? "",
        })}
        isPending={deleteDocument.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteDocument.mutate(deleteTarget.fileToken, {
            onSuccess: () => {
              toast.success(tt("deleteSuccess", { entity: t("entity") }));
              setDeleteTarget(null);
            },
          });
        }}
      />

      {hasSummary && (
        <DocumentSummarySheet
          open={summarySheetOpen}
          onOpenChange={setSummarySheetOpen}
          summary={summary}
        />
      )}

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
