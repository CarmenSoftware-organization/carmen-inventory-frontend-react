
import { useRef, useState } from "react";
import { Filter as FilterIcon, Upload } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useDocument,
  useUploadDocument,
  useDeleteDocument,
} from "@/hooks/use-document";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import DocumentCard from "./document-card";
import { useURL } from "@/hooks/use-url";
import type { DocumentFile } from "@/types/document";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { cn } from "@/lib/utils";
import { useDocumentTable } from "./use-document-table";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
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
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const tt = useTranslations("toast");
  const [typeFilter, setTypeFilter] = useURL("type");

  const TYPE_OPTIONS: { label: string; value: FileTypeKey }[] = [
    { label: "PDF", value: "pdf" },
    { label: "Excel / CSV", value: "xls" },
    { label: "Word", value: "doc" },
    { label: "Image", value: "image" },
    { label: "Text", value: "txt" },
    { label: "Archive", value: "archive" },
    { label: "Code", value: "code" },
  ];

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

  const activeFilters: ActiveFilter[] = [];
  if (typeFilter) {
    for (const v of typeFilter.split(",")) {
      const match = TYPE_OPTIONS.find((o) => o.value === v);
      if (match) {
        activeFilters.push({
          key: v,
          label: match.label,
          onRemove: () => {
            const next = typeFilter
              .split(",")
              .filter((val) => val !== v)
              .join(",");
            setTypeFilter(next);
          },
        });
      }
    }
  }

  const clearAllFilters = () => {
    setTypeFilter("");
  };

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
      toast.error(t("fileSizeLimit"));
      e.target.value = "";
      return;
    }
    uploadDocument.mutate(file, {
      onSuccess: () => toast.success(t("uploadSuccess")),
      onError: (err) => toast.error(err.message),
    });
    e.target.value = "";
  };

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

        <div className="flex w-full items-center gap-2">
          <div className="flex-1">
            <SearchInput defaultValue={search} onSearch={setSearch} />
          </div>
          <span className="bg-border hidden h-4 w-px sm:block" />
          <div className="hidden sm:block">
            <MultiSelectFilter
              value={typeFilter}
              onChange={setTypeFilter}
              placeholder={tfl("type")}
              options={TYPE_OPTIONS}
              searchable
              searchPlaceholder={t("searchType")}
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
                  value={typeFilter}
                  onChange={setTypeFilter}
                  placeholder={tfl("type")}
                  options={TYPE_OPTIONS}
                  searchable
                  searchPlaceholder={t("searchType")}
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
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
