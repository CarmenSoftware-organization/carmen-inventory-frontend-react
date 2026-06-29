
import { useState } from "react";
import {
  ArrowRight,
  Columns3,
  LayoutGrid,
  LayoutList,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { Button } from "@/components/ui/button";
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility";
import { DeleteDialog } from "@/components/ui/delete-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCurrency } from "@/hooks/use-currency";
import { useProfile } from "@/hooks/use-profile";
import {
  useExchangeRateQuery,
  useExchangeRateMutation,
  useExternalExchangeRates,
  useExchangeRateDelete,
} from "@/hooks/use-exchange-rate";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGridPagination } from "@/hooks/use-grid-pagination";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { ModuleTileIcon } from "@/components/ui/module-tile";
import SearchInput from "@/components/search-input";
import type { ExchangeRateItem, CurrencyWithDiff } from "@/types/exchange-rate";
import EmptyComponent from "@/components/empty-component";
import { CardSkeletonGrid } from "@/components/loader/card-skeleton";
import { formatDate } from "@/lib/date-utils";
import { formatExchangeRate } from "@/lib/currency-utils";
import { ExchangeRateDialog } from "./exchange-rate-dialog";
import { useExchangeRateTable } from "./use-exchange-rate-table";
import ExchangeRateCard from "./exchange-rate-card";

/**
 * Component หลักของหน้ารายการ Exchange Rate รองรับ list/grid view, การอัปเดตแบบ bulk จาก external API
 * รวมถึงการเพิ่ม/แก้ไข/ลบรายการและแสดงผลบนมือถือ
 * @returns React element ของหน้ารายการ Exchange Rate
 * @example
 * // route: /config/exchange-rate
 * <ExchangeRateComponent />
 */
export default function ExchangeRateComponent() {
  const { defaultCurrencyCode, defaultCurrencyDecimalPlaces, dateFormat } =
    useProfile();
  const _rateDecimals = defaultCurrencyDecimalPlaces ?? 4;
  const baseCurrency = defaultCurrencyCode ?? "THB";
  const t = useTranslations("config.exchangeRate");
  const tc = useTranslations("common");
  const tt = useTranslations("toast");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("edit");
  const [editItem, setEditItem] = useState<ExchangeRateItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ExchangeRateItem | null>(null);
  const [displayMode, setDisplayMode] = useState<"list" | "grid">("list");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const isMobile = useIsMobile();

  const deleteRate = useExchangeRateDelete();

  const { params, tableConfig, search, setSearch } = useDataGridState({
    defaultSort: "at_date:desc,currency_code:asc",
  });
  const queryParams = params;

  const isGridMode = isMobile || displayMode === "grid";

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useExchangeRateQuery(queryParams, {
    enabled: !isGridMode,
  });

  const grid = useGridPagination<ExchangeRateItem>({
    useListHook: useExchangeRateQuery,
    params: queryParams,
    enabled: isGridMode,
  });

  const items = isGridMode ? grid.items : (historyData?.data ?? []);
  const totalRecords = isGridMode
    ? grid.totalRecords
    : (historyData?.paginate?.total ?? 0);

  // --- Currencies (internal) ---
  const { data: currencyData, isLoading: isLoadingCurrencies } = useCurrency({
    perpage: -1,
  });

  const { data: externalRates, isRefetching } =
    useExternalExchangeRates(baseCurrency);

  // --- Currency diff ---
  // External API returns "foreign per 1 base" (e.g. base=THB → { USD: 0.028 } means 1 THB = 0.028 USD).
  // We store in direct convention "1 foreign = X base" (e.g. 1 USD = 35.71 THB), so invert before use.
  const currencies = currencyData?.data;
  const currencyWithDiff: CurrencyWithDiff[] =
    !currencies || !externalRates
      ? []
      : currencies
          .filter((c) => c.code !== baseCurrency)
          .map((c) => {
            const oldRate = c.exchange_rate;
            const externalInverse = externalRates[c.code];
            const newRate =
              externalInverse && externalInverse > 0
                ? 1 / externalInverse
                : oldRate;
            const diff = newRate - oldRate;
            const diffPercent = oldRate === 0 ? 0 : (diff / oldRate) * 100;
            return {
              id: c.id,
              code: c.code,
              oldRate,
              newRate,
              diff,
              diffPercent,
            };
          });

  const bulkMutation = useExchangeRateMutation();

  const handleBulkUpdate = () => {
    const payload = currencyWithDiff.map((item) => ({
      currency_id: item.id,
      at_date: new Date().toISOString(),
      exchange_rate: item.newRate,
    }));

    bulkMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(tt("updateSuccess", { entity: t("entity") }));
        setBulkConfirmOpen(false);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const table = useExchangeRateTable({
    items,
    totalRecords,
    params,
    tableConfig,
    onEdit: (item) => {
      setEditItem(item);
      setDialogMode("edit");
      setDialogOpen(true);
    },
    onDelete: (item) => setDeleteItem(item),
  });

  if (historyError) {
    return (
      <ErrorState
        message={historyError.message}
        onRetry={() => refetchHistory()}
      />
    );
  }

  return (
    <div className="pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Sticky top section on mobile */}
      <div className="sticky top-0 z-20 space-y-3 pb-3 sm:static sm:pb-0">
        {/* Header */}
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
            <p className="text-muted-foreground text-sm">
              {t("desc", { base: baseCurrency })}
            </p>
          </div>
          <div className="flex w-full gap-2 *:flex-1 sm:w-auto sm:*:flex-initial">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditItem(null);
                setDialogMode("create");
                setDialogOpen(true);
              }}
            >
              <Plus aria-hidden="true" />
              {t("addManual")}
            </Button>
            <Button
              size="sm"
              onClick={() => setBulkConfirmOpen(true)}
              disabled={
                isLoadingCurrencies ||
                isRefetching ||
                bulkMutation.isPending ||
                currencyWithDiff.length === 0
              }
            >
              <RefreshCw
                className={
                  isRefetching || bulkMutation.isPending ? "animate-spin" : ""
                }
                aria-hidden="true"
              />
              {bulkMutation.isPending ? t("updating") : t("update")}
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex w-full flex-1 items-center gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-initial">
              <SearchInput defaultValue={search} onSearch={setSearch} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
            {!isMobile && (
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
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3 space-y-3">
        {isGridMode && grid.isLoading && <CardSkeletonGrid />}
        {isGridMode && !grid.isLoading && items.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item, i) => (
                <ExchangeRateCard
                  key={item.id}
                  item={item}
                  index={i}
                  baseCurrency={baseCurrency}
                  onEdit={(rate) => {
                    setEditItem(rate);
                    setDialogMode("edit");
                    setDialogOpen(true);
                  }}
                  onDelete={(rate) => setDeleteItem(rate)}
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
        {isGridMode && !grid.isLoading && items.length === 0 && (
          <EmptyComponent />
        )}
        {!isGridMode && (
          <DataGrid
            table={table}
            recordCount={totalRecords}
            isLoading={isLoadingHistory}
            tableLayout={{ headerSticky: true }}
            emptyMessage={<EmptyComponent />}
          >
            <DataGridContainer className="flex max-h-[calc(100vh-13rem-3rem)] flex-col">
              <div className="flex-1 overflow-auto">
                <DataGridTable />
              </div>
              <DataGridPagination sizes={[5, 10, 25, 50, 100]} />
            </DataGridContainer>
          </DataGrid>
        )}
      </div>

      {dialogMode === "create" ? (
        <ExchangeRateDialog
          mode="create"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      ) : (
        <ExchangeRateDialog
          mode="edit"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          item={editItem}
        />
      )}

      <DeleteDialog
        open={!!deleteItem}
        onOpenChange={(open) => {
          if (!open && !deleteRate.isPending) setDeleteItem(null);
        }}
        title={t("entity")}
        description={
          deleteItem
            ? `${deleteItem.currency_code} — ${formatDate(deleteItem.at_date, dateFormat)}`
            : undefined
        }
        onConfirm={() => {
          if (!deleteItem) return;
          deleteRate.mutate(
            { id: deleteItem.id },
            {
              onSuccess: () => {
                toast.success(tt("deleteSuccess", { entity: t("entity") }));
                setDeleteItem(null);
              },
              onError: (err) => toast.error(err.message),
            },
          );
        }}
        isPending={deleteRate.isPending}
      />

      <AlertDialog
        open={bulkConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !bulkMutation.isPending) setBulkConfirmOpen(false);
        }}
      >
        <AlertDialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-lg">
          <AlertDialogHeader className="relative gap-0 px-5 pt-6 pb-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                <RefreshCw className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <AlertDialogTitle className="text-base">
                  {t("update")}
                </AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  {t("bulkUpdateConfirm", {
                    count: currencyWithDiff.length,
                  })}
                </AlertDialogDescription>
              </div>
              {currencyWithDiff.length > 0 && (
                <Badge
                  variant="primary-light"
                  size="sm"
                  className="mt-0.5 shrink-0 tabular-nums"
                >
                  {currencyWithDiff.length}
                </Badge>
              )}
            </div>
          </AlertDialogHeader>

          <div className="flex min-h-0 flex-1 flex-col border-t">
            {currencyWithDiff.length > 0 && (
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <ul className="space-y-2">
                  {currencyWithDiff.map((c) => {
                    const isIncrease = c.diff > 0;
                    const isDecrease = c.diff < 0;
                    const noChange = !isIncrease && !isDecrease;
                    return (
                      <li
                        key={c.id}
                        className="bg-muted/40 flex items-center gap-3 rounded-lg border p-2"
                      >
                        <div
                          className={`bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg ${
                            noChange
                              ? "text-muted-foreground"
                              : isIncrease
                                ? "text-success"
                                : "text-destructive"
                          }`}
                        >
                          {noChange && <Minus className="size-3.5" />}
                          {isIncrease && <TrendingUp className="size-3.5" />}
                          {isDecrease && <TrendingDown className="size-3.5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              size="xs"
                              className="text-[0.625rem]"
                            >
                              {c.code}
                            </Badge>
                            <span className="text-muted-foreground text-[0.6875rem]">
                              → {baseCurrency}
                            </span>
                          </div>
                          <div className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[0.6875rem] tabular-nums">
                            <span className="line-through">
                              {formatExchangeRate(c.oldRate)}
                            </span>
                            <ArrowRight className="size-3 shrink-0" />
                            <span className="text-foreground font-semibold">
                              {formatExchangeRate(c.newRate)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-foreground text-xs font-bold tabular-nums">
                            {isIncrease && "+"}
                            {formatExchangeRate(c.diff)}
                          </p>
                          {!noChange && (
                            <p className="text-muted-foreground text-[0.625rem] tabular-nums">
                              {isIncrease ? "+" : ""}
                              {c.diffPercent.toFixed(2)}%
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <AlertDialogFooter className="bg-muted/20 border-t px-5 py-3">
            <AlertDialogCancel disabled={bulkMutation.isPending}>
              {tc("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              size="default"
              onClick={(e) => {
                e.preventDefault();
                handleBulkUpdate();
              }}
              disabled={bulkMutation.isPending}
            >
              {bulkMutation.isPending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw aria-hidden="true" />
              )}
              {bulkMutation.isPending ? t("updating") : tc("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
