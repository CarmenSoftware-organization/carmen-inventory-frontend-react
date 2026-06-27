
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import {
  Save,
  SendHorizontal,
  RefreshCw,
  Package,
} from "lucide-react";
import { useTranslations } from "use-intl";
import { toast } from "sonner";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ErrorState } from "@/components/ui/error-state";
import { useErrorToast } from "@/hooks/use-error-toast";
import {
  usePhysicalCountById,
  useReviewPhysicalCount,
  useSavePhysicalCount,
  useRefreshPhysicalCount,
} from "@/hooks/use-physical-count";
import { cn } from "@/lib/utils";
import SearchInput from "@/components/search-input";
import { CalculatorDialog } from "../shared/calculator-dialog";
import { EntryImportDialog } from "../shared/entry-import-dialog";
import { AnimationStyles } from "@/components/share/reveal";
import { ItemListSkeleton } from "../shared/inv-shared";
import { EntryItemRow } from "../shared/entry-item-row";
import { PcEntryHeader } from "./pc-entry-header";
import { PcEntryNotesDialog } from "./pc-entry-notes-dialog";
import { EntryToolbar } from "../shared/entry-toolbar";

interface PcEntryComponentProps {
  readonly physicalCountId: string;
}

type CountFilter = "all" | "counted" | "uncounted";

const ROW_ESTIMATE = 156; // px ของการ์ดหนึ่งใบ + gap (อิงจริง ~140-160)
const ROW_GAP = 8; // gap-2

/**
 * คอมโพเนนต์หน้าบันทึกผลการนับ Physical Count (entry mode)
 * Performance: virtualized list + memoized rows + uncontrolled inputs (commit on blur)
 */
export function PcEntryComponent({ physicalCountId }: PcEntryComponentProps) {
  const t = useTranslations("inventoryManagement.physicalCount");
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [countFilter, setCountFilter] = useState<CountFilter>("all");
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calcItem, setCalcItem] = useState<{
    id: string;
    productId: string;
    name: string;
    unit: string;
  } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const errorToast = useErrorToast();

  const {
    data: pcData,
    isLoading,
    error,
    refetch,
  } = usePhysicalCountById(physicalCountId);

  const savePhysicalCount = useSavePhysicalCount(physicalCountId);
  const refreshPhysicalCount = useRefreshPhysicalCount(physicalCountId);
  const reviewPhysicalCount = useReviewPhysicalCount(physicalCountId);

  // Stable details reference — array ใหม่จะเกิดเฉพาะตอน pcData เปลี่ยน
  const details = pcData?.details ?? [];

  // Debounce search 200ms
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput), 200);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Pre-build lowercased search index — แค่ครั้งเดียวต่อ details
  const searchIndex = details.map((d) =>
    `${d.product_name} ${d.product_code} ${d.product_sku} ${d.product_local_name}`.toLowerCase(),
  );

  let counted = 0;
  for (const d of details) {
    const eff = d.id in counts ? counts[d.id] : d.actual_qty;
    if (eff != null) counted += 1;
  }
  const totalItems = details.length;
  const countedCount = counted;
  const uncountedCount = totalItems - counted;
  const percent = totalItems > 0 ? Math.round((counted / totalItems) * 100) : 0;

  // Defer search/filter changes — typing/clicking ยังลื่น virtualizer ไม่กระตุก
  const deferredSearch = useDeferredValue(search);
  const deferredFilter = useDeferredValue(countFilter);

  const filtered = (() => {
    const q = deferredSearch.trim().toLowerCase();
    const result: (typeof details)[number][] = [];
    for (let i = 0; i < details.length; i += 1) {
      const d = details[i];
      if (q && !searchIndex[i].includes(q)) continue;
      const eff = d.id in counts ? counts[d.id] : d.actual_qty;
      if (deferredFilter === "counted" && eff == null) continue;
      if (deferredFilter === "uncounted" && eff != null) continue;
      result.push(d);
    }
    return result;
  })();

  const handleCommitCount = (id: string, value: number | null) => {
    setCounts((prev) => {
      if (prev[id] === value) return prev;
      return { ...prev, [id]: value };
    });
  };

  const handleOpenCalc = (item: {
    id: string;
    productId: string;
    name: string;
    unit: string;
  }) => {
    setCalcItem(item);
  };

  const handleSetUncountedToZero = () => {
    setCounts((prev) => {
      const next = { ...prev };
      for (const d of details) {
        const eff = d.id in next ? next[d.id] : d.actual_qty;
        if (eff == null) next[d.id] = 0;
      }
      return next;
    });
  };

  const handleSave = () => {
    const saveItems: { id: string; actual_qty: number }[] = [];
    for (const d of details) {
      const eff = d.id in counts ? counts[d.id] : d.actual_qty;
      if (eff != null) saveItems.push({ id: d.id, actual_qty: eff });
    }

    savePhysicalCount.mutate(
      { items: saveItems },
      {
        onSuccess: () => {
          setLastSaved(
            new Date().toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          );
          toast.success(t("saveForResume"));
        },
        onError: errorToast,
      },
    );
  };

  // Excel/CSV Export — current effective counts
  const handleExport = async () => {
    const XLSX = await import("xlsx");
    const rows = details.map((d) => {
      const eff = d.id in counts ? counts[d.id] : d.actual_qty;
      return {
        id: d.id,
        product_code: d.product_code,
        product_name: d.product_name,
        product_local_name: d.product_local_name,
        product_sku: d.product_sku,
        inventory_unit_name: d.inventory_unit_name,
        actual_qty: eff ?? "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: [
        "id",
        "product_code",
        "product_name",
        "product_local_name",
        "product_sku",
        "inventory_unit_name",
        "actual_qty",
      ],
    });
    ws["!cols"] = [
      { wch: 36 }, // id (uuid length)
      { wch: 14 }, // product_code
      { wch: 32 }, // product_name
      { wch: 32 }, // product_local_name
      { wch: 14 }, // product_sku
      { wch: 14 }, // inventory_unit_name
      { wch: 12 }, // actual_qty
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Counts");
    const dateStr = new Date().toISOString().slice(0, 10);
    const safeLoc = (locationCode || "location").replaceAll(/[^\w-]/g, "_");
    const fileName = t("exportFileName", { location: safeLoc, date: dateStr });
    XLSX.writeFile(wb, `${fileName}.xlsx`);
    toast.success(t("exportSuccess", { count: rows.length }));
  };

  // Apply parsed updates from import dialog
  const handleApplyImport = (payload: {
    matched: number;
    total: number;
    skipped: number;
    updates: Record<string, number | null>;
  }) => {
    setCounts((prev) => ({ ...prev, ...payload.updates }));
    if (payload.skipped > 0) {
      toast.success(
        t("importPartialMatch", {
          matched: payload.matched,
          total: payload.total,
          skipped: payload.skipped,
        }),
      );
    } else {
      toast.success(
        t("importSuccess", {
          matched: payload.matched,
          total: payload.total,
        }),
      );
    }
  };

  const importItemRefs = details.map((d) => ({
    id: d.id,
    product_sku: d.product_sku,
  }));

  const handleSubmitReview = () => {
    const items: { id: string; actual_qty: number }[] = [];
    for (const d of details) {
      const eff = d.id in counts ? counts[d.id] : d.actual_qty;
      if (eff != null) items.push({ id: d.id, actual_qty: eff });
    }
    reviewPhysicalCount.mutate(
      { items },
      {
        onSuccess: (res) => {
          toast.success(t("submitReviewSuccess"));
          const newId =
            (res as { data?: { id?: string } } | undefined)?.data?.id ??
            physicalCountId;
          navigate(`/inventory-management/physical-count/${newId}/review`);
        },
        onError: errorToast,
      },
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refreshPhysicalCount.mutate(
      {},
      {
        onSuccess: async () => {
          await refetch();
          toast.success(t("productsRefreshed"));
          setIsRefreshing(false);
        },
        onError: (err) => {
          errorToast(err);
          setIsRefreshing(false);
        },
      },
    );
  };

  // Virtualizer
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE + ROW_GAP,
    overscan: 6,
    getItemKey: (i) => filtered[i]?.id ?? i,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  const locationName = pcData?.location_name ?? "";
  const locationCode = pcData?.location_code ?? "";
  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="relative isolate -mx-3 -my-3">
      <AnimationStyles />
      <div
        className="relative flex min-h-[calc(100vh-4rem-3rem)] flex-col px-4 pt-4 lg:px-4"
        style={{
          paddingBottom: "max(7rem, calc(env(safe-area-inset-bottom) + 6rem))",
        }}
      >
        <PcEntryHeader
          locationName={locationName}
          locationCode={locationCode}
          status={pcData?.status}
          countedCount={countedCount}
          totalItems={totalItems}
          percent={percent}
          startCountingAt={pcData?.start_counting_at}
          lastSaved={lastSaved}
        />

        {/* ── Search + filter pills ─────────── */}
        <div className="mb-3 flex w-full items-center gap-2">
          <div className="flex-1 [&>div]:w-full">
            <SearchInput
              defaultValue={searchInput}
              onSearch={setSearchInput}
              onInputChange={setSearchInput}
              containerClassName="w-full"
              inputClassName="border-border/40 hover:border-foreground/50 focus-visible:border-primary bg-card h-9 rounded-lg border pr-9 text-sm shadow-none transition-colors focus-visible:ring-0"
            />
          </div>
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("refreshProducts")}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="border-border/40 bg-card hover:bg-card/80 size-9 rounded-lg"
          >
            <RefreshCw
              className={cn("size-4", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>

        <EntryToolbar
          translationNamespace="inventoryManagement.physicalCount"
          countFilter={countFilter}
          onFilterChange={setCountFilter}
          totalItems={totalItems}
          countedCount={countedCount}
          uncountedCount={uncountedCount}
          onImportClick={() => setImportOpen(true)}
          onExportClick={handleExport}
          exportDisabled={details.length === 0}
        />

        {/* ── Product cards (virtualized) ─────────── */}
        <div className="flex-1">
          {isLoading && <ItemListSkeleton count={5} />}
          {!isLoading && filtered.length === 0 && totalItems > 0 && (
            <div className="border-border/40 bg-card flex items-center justify-center gap-2 rounded-xl border border-dashed py-8">
              <Package className="text-muted-foreground/60 size-4" />
              <span className="text-muted-foreground text-xs">
                {t("noItemsMatch")}
              </span>
            </div>
          )}
          {!isLoading && filtered.length > 0 && (
            <div
              ref={scrollRef}
              className="contain:strict relative h-[calc(100dvh-22rem)] overflow-auto"
            >
              <div
                style={{
                  height: rowVirtualizer.getTotalSize(),
                  position: "relative",
                }}
              >
                {virtualItems.map((vi) => {
                  const item = filtered[vi.index];
                  const eff =
                    item.id in counts ? counts[item.id] : item.actual_qty;
                  return (
                    <div
                      key={vi.key}
                      data-index={vi.index}
                      ref={rowVirtualizer.measureElement}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        transform: `translateY(${vi.start}px)`,
                        paddingBottom: ROW_GAP,
                      }}
                    >
                      <EntryItemRow
                        id={item.id}
                        index={vi.index}
                        productId={item.product_id}
                        productName={item.product_name}
                        productSku={item.product_sku}
                        inventoryUnitName={item.inventory_unit_name}
                        committedQty={eff}
                        isCounted={eff != null}
                        onCommit={handleCommitCount}
                        onOpenCalc={handleOpenCalc}
                        NotesDialog={PcEntryNotesDialog}
                        translationNamespace="inventoryManagement.physicalCount"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-border/60 bg-card/80 fixed inset-x-0 bottom-0 z-30 border-t px-4 py-3 backdrop-blur-xl">
          <TooltipProvider delayDuration={100}>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {uncountedCount === 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handleSubmitReview}
                      disabled={reviewPhysicalCount.isPending}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                    >
                      <SendHorizontal className="size-3.5" aria-hidden="true" />
                      {reviewPhysicalCount.isPending
                        ? t("submittingForReview")
                        : t("submitForReview")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {t("submitForReviewTooltip")}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    size="sm"
                    onClick={handleSetUncountedToZero}
                  >
                    {t("setEmptyToZero", { count: uncountedCount })}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
                    onClick={handleSave}
                    disabled={savePhysicalCount.isPending}
                  >
                    <Save className="size-4" aria-hidden="true" />
                    {savePhysicalCount.isPending
                      ? t("saving")
                      : t("saveForResume")}
                  </Button>
                </>
              )}
            </div>
          </TooltipProvider>
        </div>

        {/* Import Dialog */}
        <EntryImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          items={importItemRefs}
          onApply={handleApplyImport}
        />

        {/* Calculator Dialog */}
        <CalculatorDialog
          open={!!calcItem}
          onOpenChange={(v) => {
            if (!v) setCalcItem(null);
          }}
          productId={calcItem?.productId ?? ""}
          productName={calcItem?.name ?? ""}
          baseUnitName={calcItem?.unit ?? ""}
          onConfirm={(total) => {
            if (calcItem) {
              setCounts((prev) => ({ ...prev, [calcItem.id]: total }));
            }
          }}
        />
      </div>
    </div>
  );
}

