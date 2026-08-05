
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Columns3, LayoutGrid, LayoutList, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import {
  useProduct,
  useDeleteProduct,
  useExportProduct,
} from "@/hooks/use-product";
import { useCategory } from "@/hooks/use-category";
import { useSubCategory } from "@/hooks/use-sub-category";
import { useItemGroup } from "@/hooks/use-item-group";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { cn } from "@/lib/utils";
import type { Product, ProductDetail } from "@/types/product";
import { getProductStatusLabel } from "@/constant/product-status";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useProductTable } from "./use-product-table";
import EmptyComponent from "@/components/empty-component";
import ProductCard from "./pd-card";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";
import { useExportErrorToast } from "@/hooks/use-export-error-toast";

export default function ProductComponent() {
  const t = useTranslations("productManagement.product");
  const tc = useTranslations("common");
  const exportErrorToast = useExportErrorToast();
  const tt = useTranslations("toast");
  const ts = useTranslations("status");
  const tfl = useTranslations("field");
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteProduct = useDeleteProduct();
  const { exportProduct, isExporting } = useExportProduct();
  const { params, search, setSearch, tableConfig } = useDataGridState();

  const isGridMode = isMobile || displayMode === "grid";

  const { data: categoryData } = useCategory({ perpage: -1 });
  const { data: subCategoryData } = useSubCategory({ perpage: -1 });
  const { data: itemGroupData } = useItemGroup({ perpage: -1 });

  // ค่า option มาจาก query data (ชื่อจริง ไม่ใช่ i18n key) — memo กันไม่ให้ array
  // reference เปลี่ยนทุก render จน productFilterFields memo ข้างล่างไม่เคย hit
  const categoryFilterOptions = useMemo(
    () =>
      (categoryData?.data ?? [])
        .filter((c) => c.is_active)
        .map((c) => ({
          label: c.name,
          value: `product_category_id|string:${c.id}`,
        })),
    [categoryData],
  );

  const subCategoryFilterOptions = useMemo(
    () =>
      (subCategoryData?.data ?? [])
        .filter((c) => c.is_active)
        .map((c) => ({
          label: c.name,
          value: `product_sub_category_id|string:${c.id}`,
        })),
    [subCategoryData],
  );

  const itemGroupFilterOptions = useMemo(
    () =>
      (itemGroupData?.data ?? [])
        .filter((c) => c.is_active)
        .map((c) => ({
          label: c.name,
          value: `product_item_group_id|string:${c.id}`,
        })),
    [itemGroupData],
  );

  // category/sub_category/item_group เป็น 3 filter อิสระต่อกัน (ไม่มี cascade ใน
  // โค้ดเดิม — เดิม sub_category/item_group ดึงข้อมูล *ทั้งหมด* เสมอ ไม่กรองตาม
  // category ที่เลือกเลย) จึงไม่มี linkedKeys ระหว่างกัน ผู้ใช้เลือก/ล้างแต่ละ field
  // ได้อิสระเหมือนเดิมทุกประการ ค่า literal string (ชื่อ category จริง) ทำให้ต้องใช้
  // control: "custom" ห่อ MultiSelectFilter ตรง ๆ แทน control: "multi-select"
  // ทั่วไป (ตัวนั้นเรียก t(option.labelKey) กับทุก option ซึ่งจะ error ถ้า label
  // ไม่ใช่ i18n key จริง — เหมือน pattern PO_TYPE/CN_TYPE ใน Task 19)
  const productFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "filter",
        control: "status",
        labelKey: "common.status",
        options: [
          {
            labelKey: "status.active",
            value: "product_status_type|str:active",
          },
          {
            labelKey: "status.inactive",
            value: "product_status_type|str:inactive",
          },
        ],
      },
      {
        key: "category",
        control: "custom",
        labelKey: "field.category",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={categoryFilterOptions}
            className="w-full"
          />
        ),
      },
      {
        key: "sub_category",
        control: "custom",
        labelKey: "field.subCategory",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={subCategoryFilterOptions}
            className="w-full"
          />
        ),
      },
      {
        key: "item_group",
        control: "custom",
        labelKey: "field.itemGroup",
        render: (value, onChange) => (
          <MultiSelectFilter
            value={value}
            onChange={onChange}
            options={itemGroupFilterOptions}
            className="w-full"
          />
        ),
      },
    ],
    [categoryFilterOptions, subCategoryFilterOptions, itemGroupFilterOptions],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.PRODUCT,
    fields: productFilterFields,
  });

  const combinedParams = { ...params, filter: lf.filterParam };

  const { data, isLoading, error, refetch } = useProduct(combinedParams, {
    enabled: !isGridMode,
  });

  const grid = useGridPagination<ProductDetail>({
    useListHook: useProduct,
    params: combinedParams,
    enabled: isGridMode,
  });

  const products = isGridMode ? grid.items : (data?.data ?? []);
  const totalRecords = isGridMode
    ? grid.totalRecords
    : (data?.paginate?.total ?? 0);

  const handleExport = async () => {
    try {
      const count = await exportProduct({
        params: combinedParams,
        columns: [
          { header: tfl("code"), value: (r) => r.code, width: 14 },
          { header: tfl("name"), value: (r) => r.name, width: 32 },
          {
            header: tfl("localName"),
            value: (r) => r.local_name ?? "",
            width: 28,
          },
          {
            header: tfl("unit"),
            value: (r) => r.inventory_unit?.name ?? "",
            width: 12,
          },
          {
            header: tfl("category"),
            value: (r) => r.product_category?.name ?? "",
            width: 18,
          },
          {
            header: tfl("subCategory"),
            value: (r) => r.product_sub_category?.name ?? "",
            width: 18,
          },
          {
            header: tfl("itemGroup"),
            value: (r) => r.product_item_group?.name ?? "",
            width: 18,
          },
          {
            header: tfl("status"),
            value: (r) => getProductStatusLabel(ts, r.product_status_type),
            width: 10,
          },
        ],
      });
      if (count === 0) {
        toast.warning(tc("exportNoData"));
        return;
      }
      toast.success(tc("exportSuccess", { count }));
    } catch (err) {
      exportErrorToast(err);
    }
  };

  const table = useProductTable({
    products,
    totalRecords,
    params,
    tableConfig,
    onEdit: (product) =>
      navigate(`/product-management/product/${product.id}`),
    onDelete: setDeleteTarget,
  });

  if (error)
    return <ErrorState error={error} onRetry={() => refetch()} />;

  const handleAddItem = () => {
    navigate("/product-management/product/new");
  };

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <DocumentListHeader
            title={t("title")}
            description={t("desc")}
          />
          <DocumentListActions
            onExport={handleExport}
            isExporting={isExporting}
            onAdd={handleAddItem}
            addLabel={t("add")}
          />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilterSheet
              fields={productFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {!isGridMode && (
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

        <ActiveFilterBar filters={lf.activeFilters} onClearAll={lf.clearAll} />
      </div>

      <div className="mt-3 space-y-3">
        {/* Content */}
        {isGridMode && grid.isLoading && <CardSkeletonGrid />}
        {isGridMode && !grid.isLoading && grid.error && (
          <ErrorState
            message={grid.error.message}
            onRetry={() => grid.refetch?.()}
          />
        )}
        {isGridMode && !grid.isLoading && !grid.error && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  onEdit={(p) =>
                    navigate(`/product-management/product/${p.id}`)
                  }
                  onDelete={setDeleteTarget}
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
        )}
        {isGridMode && !grid.isLoading && !grid.error && products.length === 0 && (
          <EmptyComponent />
        )}
        {!isGridMode && (
          <DataGrid
            table={table}
            recordCount={totalRecords}
            tableLayout={{ headerSticky: true }}
            isLoading={isLoading}
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
              <div className="flex-1 overflow-auto">
                <div className="min-w-300">
                  <DataGridTable />
                </div>
              </div>
              <DataGridPagination />
            </DataGridContainer>
          </DataGrid>
        )}
      </div>

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) =>
          !open && !deleteProduct.isPending && setDeleteTarget(null)
        }
        title={t("deleteTitle")}
        description={t("deleteConfirm", { name: deleteTarget?.name ?? "" })}
        isPending={deleteProduct.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteProduct.mutate(deleteTarget.id, {
            onSuccess: () => {
              toast.success(tt("deleteSuccess", { entity: t("entity") }));
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
