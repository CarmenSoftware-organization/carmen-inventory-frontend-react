
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Columns3,
  Filter as FilterIcon,
  LayoutGrid,
  LayoutList,
  Loader2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { useURL } from "@/hooks/use-url";
import { cn } from "@/lib/utils";
import type { Product, ProductDetail } from "@/types/product";
import { getProductStatusLabel } from "@/constant/product-status";
import SearchInput from "@/components/search-input";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { StatusFilter } from "@/components/ui/status-filter";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { DocumentListActions } from "@/components/share/document-list-actions";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { useProductTable } from "./use-product-table";
import EmptyComponent from "@/components/empty-component";
import ProductCard from "./pd-card";

const PRODUCT_STATUS_OPTIONS = [
  { labelKey: "active" as const, value: "product_status_type|str:active" },
  { labelKey: "inactive" as const, value: "product_status_type|str:inactive" },
];

export default function ProductComponent() {
  const t = useTranslations("productManagement.product");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");
  const ts = useTranslations("status");
  const tfl = useTranslations("field");
  const navigate = useNavigate();
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const isMobile = useIsMobile();
  const deleteProduct = useDeleteProduct();
  const { exportProduct, isExporting } = useExportProduct();
  const { params, search, setSearch, filter, setFilter, tableConfig } =
    useDataGridState();
  const [categoryFilter, setCategoryFilterRaw] = useURL("category");
  const [subCategoryFilter, setSubCategoryFilterRaw] = useURL("sub_category");
  const [itemGroupFilter, setItemGroupFilterRaw] = useURL("item_group");
  const [, setPage] = useURL("page");

  // ห่อ setter ให้ reset page ด้วย (เหมือน status filter/search ที่ผ่าน
  // useListPageState) ไม่งั้นถ้าผู้ใช้อยู่ page > 1 แล้วเปลี่ยน filter จะค้างหน้า
  // เดิมซึ่งอาจไม่มีข้อมูล
  const setCategoryFilter = (v: string) => {
    setCategoryFilterRaw(v);
    setPage("");
  };
  const setSubCategoryFilter = (v: string) => {
    setSubCategoryFilterRaw(v);
    setPage("");
  };
  const setItemGroupFilter = (v: string) => {
    setItemGroupFilterRaw(v);
    setPage("");
  };

  const isGridMode = isMobile || displayMode === "grid";

  const { data: categoryData } = useCategory({ perpage: -1 });
  const { data: subCategoryData } = useSubCategory({ perpage: -1 });
  const { data: itemGroupData } = useItemGroup({ perpage: -1 });

  const categoryFilterOptions = (categoryData?.data ?? [])
    .filter((c) => c.is_active)
    .map((c) => ({
      label: c.name,
      value: `product_category_id|string:${c.id}`,
    }));

  const subCategoryFilterOptions = (subCategoryData?.data ?? [])
    .filter((c) => c.is_active)
    .map((c) => ({
      label: c.name,
      value: `product_sub_category_id|string:${c.id}`,
    }));

  const itemGroupFilterOptions = (itemGroupData?.data ?? [])
    .filter((c) => c.is_active)
    .map((c) => ({
      label: c.name,
      value: `product_item_group_id|string:${c.id}`,
    }));

  const combinedFilter =
    [params.filter, categoryFilter, subCategoryFilter, itemGroupFilter]
      .filter(Boolean)
      .join(",") || undefined;
  const combinedParams = { ...params, filter: combinedFilter };

  const activeFilters: ActiveFilter[] = (() => {
    const filters: ActiveFilter[] = [];

    if (filter) {
      const match = PRODUCT_STATUS_OPTIONS.find((o) => o.value === filter);
      if (match) {
        filters.push({
          key: `status-${filter}`,
          label: ts(match.labelKey),
          onRemove: () => setFilter(""),
        });
      }
    }

    const urlFilters: {
      value: string;
      options: { label: string; value: string }[];
      key: string;
      setter: (v: string) => void;
    }[] = [
      {
        value: categoryFilter,
        options: categoryFilterOptions,
        key: "category",
        setter: setCategoryFilter,
      },
      {
        value: subCategoryFilter,
        options: subCategoryFilterOptions,
        key: "sub_category",
        setter: setSubCategoryFilter,
      },
      {
        value: itemGroupFilter,
        options: itemGroupFilterOptions,
        key: "item_group",
        setter: setItemGroupFilter,
      },
    ];

    for (const { value, options, key, setter } of urlFilters) {
      if (!value) continue;
      for (const v of value.split(",")) {
        const match = options.find((o) => o.value === v);
        if (match) {
          filters.push({
            key: `${key}-${v}`,
            label: match.label,
            onRemove: () => {
              const next = value
                .split(",")
                .filter((val) => val !== v)
                .join(",");
              setter(next);
            },
          });
        }
      }
    }

    return filters;
  })();

  const clearAllFilters = () => {
    setFilter("");
    setCategoryFilter("");
    setSubCategoryFilter("");
    setItemGroupFilter("");
  };

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
      toast.error(err instanceof Error ? err.message : tc("exportFailed"));
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
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

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
            count={totalRecords}
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
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <StatusFilter
                value={filter}
                onChange={setFilter}
                options={PRODUCT_STATUS_OPTIONS.map((opt) => ({
                  label: ts(opt.labelKey),
                  value: opt.value,
                }))}
              />
              <MultiSelectFilter
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder={tfl("category")}
                options={categoryFilterOptions}
              />
              <MultiSelectFilter
                value={subCategoryFilter}
                onChange={setSubCategoryFilter}
                placeholder={tfl("subCategory")}
                options={subCategoryFilterOptions}
              />
              <MultiSelectFilter
                value={itemGroupFilter}
                onChange={setItemGroupFilter}
                placeholder={tfl("itemGroup")}
                options={itemGroupFilterOptions}
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
                    options={PRODUCT_STATUS_OPTIONS.map((opt) => ({
                      label: ts(opt.labelKey),
                      value: opt.value,
                    }))}
                  />
                  <MultiSelectFilter
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    placeholder={tfl("category")}
                    options={categoryFilterOptions}
                  />
                  <MultiSelectFilter
                    value={subCategoryFilter}
                    onChange={setSubCategoryFilter}
                    placeholder={tfl("subCategory")}
                    options={subCategoryFilterOptions}
                  />
                  <MultiSelectFilter
                    value={itemGroupFilter}
                    onChange={setItemGroupFilter}
                    placeholder={tfl("itemGroup")}
                    options={itemGroupFilterOptions}
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

        <ActiveFilterBar filters={activeFilters} onClearAll={clearAllFilters} />
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((item, i) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  index={i}
                  onEdit={(p) =>
                    navigate(`/product-management/product/${p.id}`)
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
                activeFilters.length > 0
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
            onError: (err) => toast.error(err.message),
          });
        }}
      />
    </div>
  );
}
