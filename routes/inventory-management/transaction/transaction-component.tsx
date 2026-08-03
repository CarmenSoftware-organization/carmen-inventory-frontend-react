import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import { useTransaction } from "@/hooks/use-transaction";
import { useDataGridState } from "@/hooks/use-data-grid-state";
import { useURL } from "@/hooks/use-url";
import SearchInput from "@/components/search-input";
import { ErrorState } from "@/components/ui/error-state";
import { ActiveFilterBar } from "@/components/ui/active-filter-bar";
import { DateRangePicker, type DateRange } from "@/components/ui/date-range-picker";
import { LookupLocation } from "@/components/lookup/lookup-location";
import { LookupCategory } from "@/components/lookup/lookup-category";
import { cn } from "@/lib/utils";
import EmptyComponent from "@/components/empty-component";
import { DocumentListHeader } from "@/components/share/document-list-header";
import { AnimationStyles, Reveal } from "@/components/share/reveal";
import { useTransactionTable } from "./use-transaction-table";
import { TransactionSummary } from "./transaction-summary";
import type { TransactionSummary as TransactionSummaryType } from "@/types/transaction";
import { DateRangeFilter, type DateRangeValue } from "./date-range-filter";
import { useListFilters } from "@/hooks/use-list-filters";
import { ViewSelector } from "@/components/list-filter/view-selector";
import { ListFilterSheet } from "@/components/list-filter/list-filter-sheet";
import { SaveViewDialog } from "@/components/list-filter/save-view-dialog";
import { LIST_PAGE_KEYS } from "@/constant/list-page-keys";
import type { FilterFieldDef } from "@/types/list-filter";

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

/**
 * ตัด clause `created_at|daterange:from,to` จากช่วงวันที่ — custom picker (ถ้ามี)
 * มาก่อน preset เสมอ (ของเดิม `buildTransactionFilter` ก่อน migrate)
 */
function buildDateRangeClause(
  pickerDateRange: DateRange | undefined,
  dateRange: DateRangeValue | "",
): string {
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
  if (fromStr && toStr) return `created_at|daterange:${fromStr},${toStr}`;
  return "";
}

export default function TransactionComponent() {
  const t = useTranslations("inventoryManagement.transaction");
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const { params, search, setSearch, tableConfig } = useDataGridState();
  // Cache label จาก Lookup onItemChange เพื่อ active filter chip
  // (URL เก็บแค่ id; refresh จะรีเซ็ต label เหลือ id ก็ยังกรองได้)
  const [locationLabel, setLocationLabel] = useState("");
  const [categoryLabel, setCategoryLabel] = useState("");
  // อ่านคู่กับ "created_at_from" ไว้เฉย ๆ สำหรับ render ปุ่มเลือกช่วงวันที่แบบกำหนดเอง
  // (ต้องใช้ทั้ง from และ to พร้อมกัน แต่ field ของ registry ส่ง value ของ key ตัวเองมา
  // ให้ตัวเดียว) อ่านตรงจาก URL ผ่าน useURL แยกต่างหาก (reactive, อัปเดตทุกครั้งที่
  // URL เปลี่ยน ไม่ผ่าน lf.values เพื่อเลี่ยง stale closure — fields useMemo จะถูกสร้าง
  // ใหม่ทุกครั้งที่ค่านี้เปลี่ยนผ่าน dependency array) เขียนค่าจริงผ่าน setValueRef
  // (lf.setValue) เสมอ เพื่อให้ page reset เหมือนกับทุก field อื่นในหน้านี้
  const [createdAtToRaw] = useURL("created_at_to");

  // field ของหน้านี้แบ่งเป็น 2 กลุ่ม:
  // (1) location_id / category_id / inventory_doc_type — ค่าที่เก็บใน URL ไม่ใช่
  //     clause เต็ม (เก็บ id ดิบ/CSV ดิบ) จึงประกาศ toClause แปลงเป็น clause ตอน
  //     encode เข้า lf.filterParam
  // (2) dateRange (preset) / created_at_from / created_at_to — สองแหล่งนี้แข่งกัน
  //     เป็น "created_at|daterange:..." clause เดียว โดย custom picker ชนะ preset
  //     เสมอ (ของเดิมก่อน migrate) เขียนเป็น toClause เดียวใน encodeFilterParam ไม่ได้
  //     (field หนึ่งไม่รู้ค่าอีก field) จึงให้ toClause คืนค่าว่างเสมอ (ไม่หลุดเข้า
  //     lf.filterParam) แล้วคำนวณ clause จริงแยกต่างหากด้วย buildDateRangeClause
  //     จาก lf.values ตอนประกอบ queryParams — ทั้ง 3 field ยังคง "จริง" ในแง่ values/
  //     activeFilters/clearAll/saved-views ปกติ
  //
  // created_at_from / created_at_to ("เลือกช่วงวันที่กำหนดเอง") มีสถานะ, clause
  // logic และ i18n key ("selectDateRange") อยู่ในหน้านี้มาตั้งแต่ก่อน migrate แต่ไม่มี
  // <DateRangePicker> render จริงสักที่ (เทียบกับปุ่ม preset ที่ยังอยู่) — เติม control
  // จริงให้ในรอบนี้เพราะ plumbing ทั้งหมดมีอยู่แล้วครบ (state, clause builder, i18n
  // key ที่ไม่เคยถูกใช้) ต่างจาก GRN/PRT ที่ไม่มี plumbing ให้ port เลย
  //
  // two-key hidden holder (แก้จาก Task 20 review finding): created_at_to ใช้
  // `hidden: true` + `labelKey: ""` จริง ๆ ตอนนี้แล้ว — ก่อนหน้านี้เคยให้ labelKey
  // เดียวกับ created_at_from เป็นทางเลี่ยง เพราะ ListFilterSheet/activeFilters เดิม
  // ไม่รู้จัก "field ที่ไม่ต้อง render/ไม่ต้องมี chip" มาก่อน ทำให้ label ซ้ำโผล่ในชีท
  // (2 แถว "Select date range") และ chip ซ้ำใน ActiveFilterBar หลังเลือกช่วงวันที่
  // ตอนนี้ framework รองรับ `hidden` แล้ว (ListFilterSheet ข้าม field นี้ทั้งหมด,
  // useListFilters.activeFilters ก็กรองออกด้วย) จึง labelKey ว่างได้จริงโดยไม่มี
  // ผลข้างเคียง (t("") ไม่ถูกเรียกเพราะ hidden field ไม่เข้าทั้งสองที่นั้นเลย) —
  // created_at_from ยังประกาศ `linkedKeys: ["created_at_to"]` เพิ่ม เพื่อให้ปุ่ม X
  // บน chip ของ created_at_from ล้าง created_at_to ไปด้วยพร้อมกัน (ไม่งั้นกดลบ chip
  // เดียวจะเหลือ created_at_to ค้างค่าเก่าไว้แบบมองไม่เห็น)
  const transactionFilterFields = useMemo<FilterFieldDef[]>(
    () => [
      {
        key: "dateRange",
        control: "custom",
        labelKey: "inventoryManagement.transaction.dateRange",
        toClause: () => "",
        render: (value, onChange) => (
          <DateRangeFilter
            value={value as DateRangeValue | ""}
            onChange={(v) => onChange(v)}
          />
        ),
      },
      {
        key: "created_at_from",
        control: "custom",
        labelKey: "inventoryManagement.transaction.selectDateRange",
        toClause: () => "",
        linkedKeys: ["created_at_to"],
        render: (value, onChange) => (
          <DateRangePicker
            value={{ from: value, to: createdAtToRaw }}
            onValueChange={(range) => {
              onChange(range.from ?? "");
              setValueRef.current("created_at_to", range.to ?? "");
            }}
            placeholder={t("selectDateRange")}
            className="w-full"
          />
        ),
      },
      {
        key: "created_at_to",
        control: "custom",
        labelKey: "",
        hidden: true,
        toClause: () => "",
        render: () => null,
      },
      {
        key: "location_id",
        control: "custom",
        labelKey: "field.location",
        toClause: (v) => `location_id:${v}`,
        render: (value, onChange) => (
          <LookupLocation
            value={value}
            defaultLabel={locationLabel || value}
            onValueChange={(id) => {
              onChange(id);
              if (!id) setLocationLabel("");
            }}
            onItemChange={(loc) => setLocationLabel(loc.name)}
            placeholder={t("allLocations")}
            size="sm"
            className="w-full"
          />
        ),
      },
      {
        key: "category_id",
        control: "custom",
        labelKey: "field.category",
        toClause: (v) => `category_id:${v}`,
        render: (value, onChange) => (
          <LookupCategory
            value={value}
            defaultLabel={categoryLabel || value}
            onValueChange={(id, item) => {
              onChange(id);
              if (!id) setCategoryLabel("");
              else if (item) setCategoryLabel(item.name);
            }}
            size="sm"
            className="w-full"
          />
        ),
      },
      {
        key: "inventory_doc_type",
        control: "custom",
        labelKey: "inventoryManagement.transaction.referenceType",
        toClause: (v) => `inventory_doc_type|in:${v}`,
        render: (value, onChange) => {
          const refTypes = new Set(value ? value.split(",").filter(Boolean) : []);
          const toggle = (v: string) => {
            const next = new Set(refTypes);
            if (next.has(v)) next.delete(v);
            else next.add(v);
            onChange([...next].join(","));
          };
          return (
            <div className="flex flex-wrap items-center gap-1.5">
              {REF_TYPE_OPTIONS.map((opt) => {
                const active = refTypes.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={cn(
                      "border-border/40 bg-card hover:bg-card inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-micro font-semibold tracking-wide transition-all",
                      active && "border-primary bg-primary/10 text-primary",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          );
        },
      },
    ],
    [t, locationLabel, categoryLabel, createdAtToRaw],
  );

  const lf = useListFilters({
    pageKey: LIST_PAGE_KEYS.INVENTORY_TRANSACTION,
    fields: transactionFilterFields,
  });

  // setValue (จาก useListFilters) ได้ reference ใหม่ทุก render — เก็บไว้ใน ref กัน
  // ไม่ให้หลุดเข้า useMemo deps ข้างบน (chicken-and-egg: fields ต้องมีอยู่ก่อน
  // useListFilters ถึงจะสร้าง lf ได้ จึงอ้าง lf.setValue ผ่าน ref แทนเรียกตรง ๆ)
  // อัปเดต ref ใน useEffect (หลัง render เสร็จ) ไม่ใช่เขียนตรงกลาง render —
  // ต่างจาก PR/SR pilot ที่เขียนตรง ๆ (`ref.current = value`) เพราะบรรทัดนั้นชน
  // eslint react-hooks/refs ("Cannot access refs during render") ในไฟล์นี้
  // (ทำไมไฟล์อื่นไม่ชนไม่แน่ใจ — อาจเป็นเพราะ React Compiler bail out ไปก่อนถึง
  // จุดนั้นด้วยเหตุผลอื่นในไฟล์นั้น) useEffect ให้ผลเหมือนกันและปลอดภัยกว่าแน่นอน —
  // ตัว render closure เรียก setValueRef.current หลัง user โต้ตอบเท่านั้น (event
  // handler) ซึ่งเกิดหลัง effect ของ render นั้นทำงานเสมอ
  const setValueRef = useRef(lf.setValue);
  useEffect(() => {
    setValueRef.current = lf.setValue;
  });

  const dateClause = buildDateRangeClause(
    lf.values.created_at_from || lf.values.created_at_to
      ? { from: lf.values.created_at_from, to: lf.values.created_at_to }
      : undefined,
    (lf.values.dateRange || "") as DateRangeValue | "",
  );

  const queryParams = {
    ...params,
    filter: [lf.filterParam, dateClause].filter(Boolean).join(";") || undefined,
  };

  const { data, isLoading, error, refetch } = useTransaction(queryParams);

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

  return (
    <div className="relative isolate -mx-3 -my-3">
      <AnimationStyles />
      <div className="relative px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] lg:p-4">
        {/* ── Page header ─────────── */}
        <Reveal>
          <DocumentListHeader title={t("title")} description={t("desc")} />
        </Reveal>

        {/* ── Search + filters ─────────── */}
        <Reveal delay={60}>
          <div className="mt-4 flex w-full flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 [&>div]:w-full">
              <SearchInput
                defaultValue={search}
                onSearch={setSearch}
                containerClassName="w-full"
                inputClassName="border-border/40 hover:border-foreground/50 focus-visible:border-primary bg-card h-9 rounded-lg border pr-9 text-sm shadow-none transition-colors focus-visible:ring-0"
              />
            </div>
            <ViewSelector
              view={lf.view}
              snapshot={{ filters: lf.values, sort: lf.sortParam || undefined }}
            />
            <ListFilterSheet
              fields={transactionFilterFields}
              values={lf.values}
              setValue={lf.setValue}
              onClearAll={lf.clearAll}
              onSaveClick={() => setSaveViewDialogOpen(true)}
              activeCount={lf.activeFilters.length}
            />
          </div>
        </Reveal>

        {/* ── Active filter bar ─────────── */}
        {lf.activeFilters.length > 0 && (
          <Reveal delay={120}>
            <div className="mt-3">
              <ActiveFilterBar
                filters={lf.activeFilters}
                onClearAll={lf.clearAll}
              />
            </div>
          </Reveal>
        )}

        {/* ── Summary stats ─────────── */}
        <Reveal delay={180}>
          <div className="mt-4">
            <TransactionSummary data={data?.summary ?? EMPTY_SUMMARY} />
          </div>
        </Reveal>

        {/* ── Data grid (glass card) ─────────── */}
        <Reveal delay={240}>
          <div className="border-border/60 bg-card mt-4 overflow-hidden rounded-xl border">
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
