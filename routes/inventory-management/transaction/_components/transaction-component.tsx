
import { useState } from "react";
import { useTranslations } from "use-intl";
import { useURL } from "@/hooks/use-url";
import { ArrowRightLeft, Filter as FilterIcon } from "lucide-react";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { useTransaction } from "@/hooks/use-transaction";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import SearchInput from "@/components/search-input";
import { ErrorState } from "@/components/ui/error-state";
import {
  ActiveFilterBar,
  type ActiveFilter,
} from "@/components/ui/active-filter-bar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { type DateRange } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { LookupLocation } from "@/components/lookup/lookup-location";
import { LookupCategory } from "@/components/lookup/lookup-category";
import { cn } from "@/lib/utils";
import EmptyComponent from "@/components/empty-component";
import { InvPageHeader } from "../../_shared/inv-shared";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import { useTransactionTable } from "./use-transaction-table";
import { TransactionSummary } from "./transaction-summary";
import type { TransactionSummary as TransactionSummaryType } from "@/types/transaction";
import { DateRangeFilter, type DateRangeValue } from "./date-range-filter";

const EMPTY_SUMMARY: TransactionSummaryType = {
  total_transactions: 0,
  adjustments_count: 0,
  inbound: { units: 0, total_cost: 0 },
  outbound: { units: 0, total_cost: 0 },
  net_change: { units: 0, total_cost: 0 },
};

const REF_TYPE_OPTIONS = [
  { label: "GRN", value: "good_received_note" },
  { label: "SR", value: "store_requisition" },
  { label: "SI", value: "stock_in" },
  { label: "SO", value: "stock_out" },
  { label: "PC", value: "physical_count" },
] as const;

/** format Date → `YYYY-MM-DD` (no timezone shift) */
function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface BuildFilterArgs {
  pickerDateRange: DateRange | undefined;
  dateRange: DateRangeValue | "";
  txnType: string;
  location: string;
  category: string;
  refTypes: Set<string>;
}

/**
 * Build filter query string ตาม API convention:
 * `field:value;field|op:val1,val2`
 *
 * ตัวอย่าง:
 *   `inventory_doc_type|in:grn,sr;created_at|daterange:2026-05-01,2026-05-31;location_id:loc1`
 *
 * - Custom date picker (`pickerDateRange`) มี priority เหนือ preset (`dateRange`)
 * - Preset แปลงเป็น from/to relative กับวันปัจจุบัน
 */
function buildTransactionFilter({
  pickerDateRange,
  dateRange,
  txnType,
  location,
  category,
  refTypes,
}: BuildFilterArgs): string {
  const parts: string[] = [];

  // Date range (custom picker > preset) — output `YYYY-MM-DD`
  let fromStr: string | null = null;
  let toStr: string | null = null;
  if (pickerDateRange?.from) {
    fromStr = pickerDateRange.from.slice(0, 10);
    toStr = (pickerDateRange.to ?? pickerDateRange.from).slice(0, 10);
  } else if (dateRange) {
    const today = new Date();
    toStr = toDateOnly(today);
    if (dateRange === "today") {
      fromStr = toStr;
    } else if (dateRange === "7d") {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      fromStr = toDateOnly(from);
    } else if (dateRange === "30d") {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      fromStr = toDateOnly(from);
    } else if (dateRange === "this_month") {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      fromStr = toDateOnly(from);
    }
  }
  if (fromStr && toStr) {
    parts.push(`created_at|daterange:${fromStr},${toStr}`);
  }

  // Direction (inbound / outbound)
  if (txnType) parts.push(`direction:${txnType}`);

  // Location + Category single-select
  if (location) parts.push(`location_id:${location}`);
  if (category) parts.push(`category_id:${category}`);

  // Ref type multi-select
  if (refTypes.size > 0) {
    parts.push(`inventory_doc_type|in:${[...refTypes].join(",")}`);
  }

  return parts.join(";");
}

export default function TransactionComponent() {
  const t = useTranslations("inventoryManagement.transaction");
  const tc = useTranslations("common");
  // URL-backed state — ชื่อ key ตรงกับ API field name
  const [dateRangeRaw, setDateRangeRaw] = useURL("dateRange");
  const [dateFrom, setDateFrom] = useURL("created_at_from");
  const [dateTo, setDateTo] = useURL("created_at_to");
  const [txnType, setTxnType] = useURL("direction");
  const [location, setLocation] = useURL("location_id");
  const [category, setCategory] = useURL("category_id");
  const [refTypesRaw, setRefTypesRaw] = useURL("inventory_doc_type");
  const { params, search, setSearch, tableConfig } = useDataGridState();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  // Cache label จาก Lookup onItemChange เพื่อ active filter chip
  // (URL เก็บแค่ id; refresh จะรีเซ็ต label เหลือ id ก็ยังกรองได้)
  const [locationLabel, setLocationLabel] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");

  // Derive typed/composite values from URL strings
  const dateRange = (dateRangeRaw ?? "") as DateRangeValue | "";
  const setDateRange = (v: DateRangeValue | "") => setDateRangeRaw(v);
  const pickerDateRange: DateRange | undefined =
    dateFrom || dateTo ? { from: dateFrom, to: dateTo } : undefined;
  const setPickerDateRange = (v: DateRange | undefined) => {
    setDateFrom(v?.from ?? "");
    setDateTo(v?.to ?? "");
  };
  const refTypes = new Set(
    refTypesRaw ? refTypesRaw.split(",").filter(Boolean) : [],
  );
  const setRefTypes = (next: Set<string>) =>
    setRefTypesRaw([...next].join(","));

  const toggleRefType = (value: string) => {
    const next = new Set(refTypes);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setRefTypes(next);
  };

  const activeFilters = ((): ActiveFilter[] => {
    const filters: ActiveFilter[] = [];

    if (pickerDateRange?.from) {
      filters.push({
        key: "dateRange",
        label: t("dateRange"),
        onRemove: () => setPickerDateRange(undefined),
      });
    }

    if (txnType) {
      const label = txnType === "inbound" ? t("inbound") : t("outbound");
      filters.push({
        key: txnType,
        label,
        onRemove: () => setTxnType(""),
      });
    }

    if (location) {
      filters.push({
        key: location,
        label: locationLabel || location,
        onRemove: () => {
          setLocation("");
          setLocationLabel("");
        },
      });
    }

    if (category) {
      filters.push({
        key: category,
        label: categoryLabel || category,
        onRemove: () => {
          setCategory("");
          setCategoryLabel("");
        },
      });
    }

    for (const v of refTypes) {
      const match = REF_TYPE_OPTIONS.find((o) => o.value === v);
      if (match) {
        filters.push({
          key: `refType-${v}`,
          label: match.label,
          onRemove: () => {
            const next = new Set(refTypes);
            next.delete(v);
            setRefTypes(next);
          },
        });
      }
    }

    return filters;
  })();

  const clearAllFilters = () => {
    setPickerDateRange(undefined);
    setDateRange("");
    setTxnType("");
    setLocation("");
    setLocationLabel("");
    setCategory("");
    setCategoryLabel("");
    setRefTypes(new Set());
  };

  // Build filter string from local state for BE — convention:
  // `field:value;field|op:val1,val2` (semicolons separate filters)
  const filterStr = buildTransactionFilter({
    pickerDateRange,
    dateRange,
    txnType,
    location,
    category,
    refTypes,
  });
  const mergedParams = {
    ...params,
    filter: [params.filter, filterStr].filter(Boolean).join(";") || undefined,
  };

  const { data, isLoading, error, refetch } = useTransaction(mergedParams);

  const items = data?.data ?? [];
  const totalRecords = data?.paginate?.total ?? 0;

  const table = useTransactionTable({
    items,
    totalRecords,
    params,
    tableConfig,
  });

  if (error)
    return <ErrorState message={error.message} onRetry={() => refetch()} />;

  /* ── Inline filters (desktop) ─────────── */
  const filtersContent = (
    <>
      <div className="w-full sm:w-56">
        <LookupLocation
          value={location}
          defaultLabel={locationLabel || location}
          onValueChange={(id) => {
            setLocation(id);
            if (!id) setLocationLabel("");
          }}
          onItemChange={(loc) => setLocationLabel(loc.name)}
          placeholder={t("allLocations")}
          size="sm"
        />
      </div>
      <div className="w-full sm:w-56">
        <LookupCategory
          value={category}
          defaultLabel={categoryLabel || category}
          onValueChange={(id, item) => {
            setCategory(id);
            if (!id) setCategoryLabel("");
            else if (item) setCategoryLabel(item.name);
          }}
          size="sm"
        />
      </div>
    </>
  );

  /* ── Ref type pills (glass) ─────────── */
  const refTypeContent = (
    <div className="space-y-1.5">
      <span className="text-muted-foreground text-[0.5625rem] font-semibold tracking-widest uppercase">
        {t("referenceType")}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {REF_TYPE_OPTIONS.map((opt) => {
          const active = refTypes.has(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleRefType(opt.value)}
              className={cn(
                "border-border/40 bg-card/40 hover:bg-card/80 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide backdrop-blur-sm transition-all",
                active &&
                  "border-primary bg-primary/10 text-primary shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary),transparent_88%)]",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="relative isolate -mx-3 -my-3">
      <AnimationStyles />
      <div className="relative px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] lg:p-4">
        {/* ── Page header ─────────── */}
        <Reveal>
          <InvPageHeader
            icon={ArrowRightLeft}
            eyebrow={t("title")}
            title={t("title")}
            desc={t("desc")}
          />
        </Reveal>

        {/* ── Search + DateRange + Mobile Filter ─────────── */}
        <Reveal delay={60}>
          <div className="mt-4 flex w-full items-center gap-2">
            <div className="flex-1 [&>div]:w-full">
              <SearchInput
                defaultValue={search}
                onSearch={setSearch}
                containerClassName="w-full"
                inputClassName="border-border/40 hover:border-foreground/50 focus-visible:border-primary bg-card/40 h-9 rounded-lg border pr-9 text-sm shadow-none backdrop-blur-sm transition-colors focus-visible:ring-0"
              />
            </div>
            <div className="hidden sm:block">
              <DateRangeFilter
                value={dateRange}
                onChange={(v) => setDateRange(v)}
              />
            </div>
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="border-border/40 bg-card/40 hover:bg-card/80 relative size-9 shrink-0 rounded-lg backdrop-blur-sm sm:hidden"
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
              <SheetContent
                side="bottom"
                className="max-h-[85vh] overflow-auto"
              >
                <SheetHeader>
                  <SheetTitle>{t("title")}</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-3 p-4">
                  <DateRangeFilter
                    value={dateRange}
                    onChange={(v) => setDateRange(v)}
                  />
                  {filtersContent}
                  {refTypeContent}
                  <Button
                    variant="outline"
                    className="h-11 w-full rounded-full"
                    onClick={() => setFilterSheetOpen(false)}
                  >
                    Done
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </Reveal>

        {/* ── Inline filters (desktop) ─────────── */}
        <Reveal delay={120}>
          <div className="mt-3 hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            {filtersContent}
          </div>
        </Reveal>

        {/* ── Ref type pills (desktop) ─────────── */}
        <Reveal delay={160}>
          <div className="mt-3 hidden sm:block">{refTypeContent}</div>
        </Reveal>

        {/* ── Active filter bar ─────────── */}
        {activeFilters.length > 0 && (
          <Reveal delay={200}>
            <div className="mt-3">
              <ActiveFilterBar
                filters={activeFilters}
                onClearAll={clearAllFilters}
              />
            </div>
          </Reveal>
        )}

        {/* ── Summary stats ─────────── */}
        <Reveal delay={240}>
          <div className="mt-4">
            <TransactionSummary data={data?.summary ?? EMPTY_SUMMARY} />
          </div>
        </Reveal>

        {/* ── Data grid (glass card) ─────────── */}
        <Reveal delay={280}>
          <div className="border-border/60 bg-card/70 mt-4 overflow-hidden rounded-xl border backdrop-blur-xl">
            <DataGrid
              table={table}
              recordCount={totalRecords}
              isLoading={isLoading}
              tableLayout={{ headerSticky: true }}
              emptyMessage={<EmptyComponent />}
            >
              <DataGridContainer>
                <DataGridTable />
                <DataGridPagination />
              </DataGridContainer>
            </DataGrid>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
