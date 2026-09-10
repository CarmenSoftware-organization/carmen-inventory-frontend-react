import { useCallback, useMemo, useState } from "react";
import { useWatch, useFormState, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type Updater,
} from "@tanstack/react-table";
import { AlertTriangle, FilterX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import {
  DataGridTable,
  DataGridTableRowSelect,
} from "@/components/ui/data-grid/data-grid-table";
import {
  columnSkeletons,
  selectColumn,
} from "@/components/ui/data-grid/columns";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { InputQty } from "@/components/ui/input/input-qty";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import EmptyComponent from "@/components/empty-component";
import SearchInput from "@/components/search-input";
import { ListFilter } from "@/components/list-filter/list-filter";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { round2 } from "@/lib/currency-utils";
import { useCurrency } from "@/hooks/use-currency";
import { useActivePriceListsByVendor } from "@/hooks/use-price-list";
import type { PriceList, PriceListDetailItem } from "@/types/price-list";
import { usePlRowFilter } from "./use-pl-row-filter";
import {
  WIZARD_ITEM_TEMPLATE,
  type FromPriceListFormValues,
  type FromPriceListSelectedItem,
} from "./from-price-list-form-schema";

interface StepSelectItemsProps {
  readonly form: UseFormReturn<FromPriceListFormValues>;
}

/** แถวหนึ่งในตาราง = สินค้าหนึ่งบรรทัดของ price list หนึ่งใบ */
interface PlRow {
  readonly detail: PriceListDetailItem;
  readonly pricelistNo: string;
  readonly currency: { id: string; code: string; name?: string };
}

function toRows(priceLists: PriceList[]): PlRow[] {
  return priceLists.flatMap((pl) =>
    pl.pricelist_detail.map((detail) => ({
      detail,
      pricelistNo: pl.no,
      currency: pl.currency,
    })),
  );
}

function filterRows(rows: PlRow[], q: string): PlRow[] {
  if (!q) return rows;
  const needle = q.toLowerCase();
  return rows.filter(
    ({ detail, pricelistNo }) =>
      (detail.product_code ?? "").toLowerCase().includes(needle) ||
      detail.product_name.toLowerCase().includes(needle) ||
      detail.product_local_name.toLowerCase().includes(needle) ||
      pricelistNo.toLowerCase().includes(needle),
  );
}

function detailToItem(row: PlRow): FromPriceListSelectedItem {
  const { detail } = row;
  const qty = detail.moq_qty || 1;
  const subTotal = round2(qty * detail.price);
  const taxAmt = round2((subTotal * (detail.tax_rate ?? 0)) / 100);
  return {
    ...WIZARD_ITEM_TEMPLATE,
    pricelist_detail_id: detail.id,
    pricelist_no: row.pricelistNo,
    product_id: detail.product_id,
    product_code: detail.product_code ?? "",
    product_name: detail.product_name,
    product_local_name: detail.product_local_name,
    product_sku: detail.product_sku ?? "",
    order_unit_id: detail.unit_id,
    order_unit_name: detail.unit_name ?? "",
    order_unit_conversion_factor: 1,
    order_qty: qty,
    base_unit_id: detail.unit_id,
    base_unit_name: detail.unit_name ?? "",
    base_qty: qty,
    price: detail.price,
    sub_total_price: subTotal,
    net_amount: subTotal,
    total_price: subTotal + taxAmt,
    tax_profile_id: detail.tax_profile_id,
    tax_profile_name: detail.tax_profile_name ?? "",
    tax_rate: detail.tax_rate ?? 0,
    tax_amount: taxAmt,
  };
}

/** error ของ item รายแถว — RHF เก็บเป็น array ตาม index ของ `items` */
type RowError =
  | {
      location_id?: { message?: string };
      order_qty?: { message?: string };
    }
  | undefined;

export function StepSelectItems({ form }: StepSelectItemsProps) {
  "use no memo";
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const tl = useTranslations("lookup");

  const vendorId = useWatch({ control: form.control, name: "vendor_id" });
  const deliveryDate = useWatch({
    control: form.control,
    name: "delivery_date",
  });
  const workflowId =
    useWatch({ control: form.control, name: "workflow_id" }) ?? "";
  const itemsRaw = useWatch({ control: form.control, name: "items" });
  const items = useMemo(
    () => (itemsRaw ?? []) as FromPriceListSelectedItem[],
    [itemsRaw],
  );

  // ต้อง subscribe ผ่าน useFormState — อ่าน form.formState.errors ตรง ๆ จะได้ค่า
  // เก่า (stale) ทำให้ error ของคลังแสดงช้าไป 1 จังหวะ (เลือกแล้วเพิ่งแดง)
  const { errors: formErrors } = useFormState({ control: form.control });
  const itemsError = formErrors.items;
  const itemsErrorMessage =
    typeof itemsError?.message === "string" ? itemsError.message : undefined;

  const apiDate = deliveryDate
    ? formatDate(deliveryDate, "yyyy-MM-dd")
    : undefined;

  const {
    data: priceLists,
    isLoading,
    error,
  } = useActivePriceListsByVendor(vendorId, apiDate);

  const [search, setSearch] = useState("");
  // `data` ของ TanStack ต้องคงตัวตนไว้ระหว่าง render ที่ไม่มีอะไรเปลี่ยน — ส่ง array
  // ใหม่ทุกรอบจะไปปลุก autoReset ของ table ให้ setState แล้ววนไม่จบ (จอค้าง กดติ๊ก
  // ไม่ติด) ด้วยเหตุผลเดียวกันจึงต้อง default `?? []` **ในนี้** ไม่ใช่ตอน destructure
  const allRows = useMemo(() => toRows(priceLists ?? []), [priceLists]);
  const filter = usePlRowFilter(allRows);
  const rows = useMemo(
    () => filterRows(allRows, search.trim()).filter(filter.matches),
    [allRows, search, filter.matches],
  );

  // เรตของสกุลเงินที่เลือก — LookupCurrency ใช้ perpage 30 เหมือนฟอร์ม PO ปกติ
  // ไม่ดึงมาเทียบ ใบสกุลต่างประเทศจะถูกส่งด้วย exchange_rate 1 ของ EMPTY_FORM
  const { data: currencyData } = useCurrency({ perpage: 30 });
  const currencies = currencyData?.data ?? [];

  const selectedByDetail = useMemo(
    () => new Map(items.map((i) => [i.pricelist_detail_id, i] as const)),
    [items],
  );

  // ล็อก 1 ใบ = 1 สกุลเงิน — สกุลของแถวที่ติ๊กไว้ตัวแรกเป็นตัวตั้ง แถวสกุลอื่นถูกปิด
  // จนกว่าจะติ๊กออกหมด (กติกาเดิมของ dialog ที่ถูกยกมา)
  const activeCurrency =
    allRows.find((r) => selectedByDetail.has(r.detail.id))?.currency ?? null;

  const totalAmount = items.reduce(
    (sum, item) => sum + round2((Number(item.order_qty) || 0) * item.price),
    0,
  );

  const setItems = useCallback(
    (next: FromPriceListSelectedItem[]) => {
      form.setValue("items", next, { shouldDirty: true, shouldValidate: true });
    },
    [form],
  );

  const patchItem = useCallback(
    (detailId: string, patch: Partial<FromPriceListSelectedItem>) => {
      const current = (form.getValues("items") ??
        []) as FromPriceListSelectedItem[];
      setItems(
        current.map((i) =>
          i.pricelist_detail_id === detailId ? { ...i, ...patch } : i,
        ),
      );
    },
    [form, setItems],
  );

  /** มุมมองของ `items` ในภาษาของ TanStack — ไม่ใช่ state ที่ถือคู่ขนาน */
  const rowSelection = useMemo<RowSelectionState>(
    () => Object.fromEntries(items.map((i) => [i.pricelist_detail_id, true])),
    [items],
  );

  const handleRowSelectionChange = (updater: Updater<RowSelectionState>) => {
    const next =
      typeof updater === "function" ? updater(rowSelection) : updater;
    const wanted = new Set(Object.keys(next).filter((key) => next[key]));

    const current = (form.getValues("items") ??
      []) as FromPriceListSelectedItem[];
    const kept = current.filter((i) => wanted.has(i.pricelist_detail_id));
    const keptIds = new Set(kept.map((i) => i.pricelist_detail_id));
    const added = allRows.filter(
      (r) => wanted.has(r.detail.id) && !keptIds.has(r.detail.id),
    );

    // "เลือกทั้งหมด" กวาดได้ทุกแถวตอนที่ยังไม่มีสกุลตั้งต้น (ยังไม่มีแถวไหนถูกล็อก)
    // กติกา 1 ใบ 1 สกุลจึงต้องบังคับซ้ำตรงนี้ ไม่ใช่พึ่ง enableRowSelection อย่างเดียว
    // — ยึดสกุลของแถวแรกที่เพิ่มเข้ามา แล้วทิ้งแถวสกุลอื่น
    const currency =
      kept.length > 0 ? activeCurrency : (added[0]?.currency ?? null);
    const accepted = currency
      ? added.filter((r) => r.currency.id === currency.id)
      : added;

    const nextItems = [...kept, ...accepted.map(detailToItem)];
    setItems(nextItems);

    if (nextItems.length === 0) {
      // ไม่เหลือของแล้ว = ปลดล็อกสกุลเงิน รอบหน้าติ๊ก PL ใบไหนก็ได้
      form.setValue("currency_id", "", { shouldDirty: true });
      form.setValue("currency_code", "", { shouldDirty: true });
      form.setValue("exchange_rate", 1, { shouldDirty: true });
      return;
    }

    if (currency && !form.getValues("currency_id")) {
      form.setValue("currency_id", currency.id, { shouldDirty: true });
      form.setValue("currency_code", currency.code, { shouldDirty: true });
      const rate = currencies.find((c) => c.id === currency.id)?.exchange_rate;
      if (rate != null) {
        form.setValue("exchange_rate", rate, { shouldDirty: true });
      }
    }
  };

  const errorOf = useCallback(
    (detailId: string): RowError => {
      if (!Array.isArray(itemsError)) return undefined;
      const index = items.findIndex((i) => i.pricelist_detail_id === detailId);
      return index < 0 ? undefined : (itemsError[index] as RowError);
    },
    [items, itemsError],
  );

  const columns = useMemo<ColumnDef<PlRow>[]>(() => {
    /** แถวสกุลอื่น = เลือกไม่ได้ ทำให้จางไว้ให้เห็นว่าตอนนี้ใช้ไม่ได้ */
    const dim = (row: PlRow) =>
      activeCurrency != null && row.currency.id !== activeCurrency.id
        ? "opacity-50"
        : undefined;

    return [
      {
        ...selectColumn<PlRow>(),
        size: 44,
        // ของกลางไม่ส่ง disabled ให้ checkbox — แถวที่เลือกไม่ได้จะกดแล้วเงียบ
        cell: ({ row }) => (
          <DataGridTableRowSelect row={row} disabled={!row.getCanSelect()} />
        ),
      },
      {
        id: "pricelist_no",
        header: t("priceListNo"),
        size: 130,
        meta: { skeleton: columnSkeletons.textShort },
        cell: ({ row }) => (
          <span className={cn("font-semibold", dim(row.original))}>
            {row.original.pricelistNo}
          </span>
        ),
      },
      {
        id: "product",
        header: tfl("product"),
        size: 240,
        meta: { skeleton: columnSkeletons.text },
        cell: ({ row }) => (
          <div className={cn("flex flex-col", dim(row.original))}>
            <span className="font-semibold">
              {row.original.detail.product_name}
            </span>
            <span className="text-muted-foreground text-micro-legal">
              {row.original.detail.product_local_name}
            </span>
          </div>
        ),
      },
      {
        id: "unit",
        header: tfl("unit"),
        size: 90,
        meta: {
          cellClassName: "text-muted-foreground",
          skeleton: columnSkeletons.textShort,
        },
        cell: ({ row }) => (
          <span className={dim(row.original)}>
            {row.original.detail.unit_name ?? "—"}
          </span>
        ),
      },
      {
        id: "price",
        header: tfl("unitPrice"),
        size: 130,
        meta: {
          headerClassName: "text-right",
          cellClassName: "text-right tabular-nums",
          skeleton: columnSkeletons.textShort,
        },
        cell: ({ row }) => (
          <span className={dim(row.original)}>
            {row.original.detail.price.toLocaleString()}{" "}
            <span className="text-muted-foreground text-micro">
              {row.original.currency.code}
            </span>
          </span>
        ),
      },
      {
        id: "qty",
        header: tfl("qty"),
        size: 110,
        meta: {
          headerClassName: "text-right",
          skeleton: columnSkeletons.textShort,
        },
        cell: ({ row }) => {
          const { detail } = row.original;
          const selected = selectedByDetail.get(detail.id);
          // กรอกได้เฉพาะแถวที่ติ๊กแล้ว — ยังไม่ติ๊กก็ยังไม่มี item ให้แก้
          return (
            <InputQty
              className="h-8 text-right"
              disabled={!selected}
              error={errorOf(detail.id)?.order_qty?.message}
              value={Number(selected?.order_qty ?? detail.moq_qty)}
              onChange={(e) => {
                const n = e.target.valueAsNumber;
                patchItem(detail.id, {
                  order_qty: Number.isNaN(n) ? 0 : n,
                  base_qty: Number.isNaN(n) ? 0 : n,
                });
              }}
            />
          );
        },
      },
      {
        id: "location",
        header: tfl("location"),
        size: 200,
        meta: { skeleton: columnSkeletons.text },
        cell: ({ row }) => {
          const { detail } = row.original;
          const selected = selectedByDetail.get(detail.id);
          return (
            <LookupProductLocation
              productId={detail.product_id}
              workflowId={workflowId}
              value={selected?.location_id ?? ""}
              onValueChange={(v) => patchItem(detail.id, { location_id: v })}
              onItemChange={(loc) =>
                patchItem(detail.id, {
                  location_code: loc.code ?? "",
                  location_name: loc.name ?? "",
                })
              }
              disabled={!selected}
              error={errorOf(detail.id)?.location_id?.message}
              className="h-8 w-full text-xs"
            />
          );
        },
      },
    ];
  }, [
    activeCurrency,
    selectedByDetail,
    errorOf,
    patchItem,
    workflowId,
    t,
    tfl,
  ]);

  const disabled = !vendorId || !apiDate;

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // ตารางนี้ไม่มีหน้า — ปิด autoReset ไว้ไม่ให้ data ที่เปลี่ยนไปสั่ง setPageIndex
    autoResetPageIndex: false,
    // id ของแถว = id ของบรรทัด price list ตัวเดียวกับที่ item ใช้จับคู่
    getRowId: (row) => row.detail.id,
    state: { rowSelection },
    onRowSelectionChange: handleRowSelectionChange,
    enableRowSelection: (row) =>
      activeCurrency == null || row.original.currency.id === activeCurrency.id,
  });

  return (
    <Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel required>{tfl("product")}</FieldLabel>
        <div className="flex items-center gap-2">
          <Badge variant={items.length > 0 ? "default" : "secondary"}>
            {t("nProductsSelected", { count: items.length })}
          </Badge>
          {totalAmount > 0 && (
            <Badge variant="secondary">
              {tfl("total")}: {totalAmount.toLocaleString()}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {/* กรองในฝั่ง client จากรายการที่โหลดมาแล้ว — onInputChange กรองทันทีที่พิมพ์
            (ไม่ใช่รอ Enter) เหมือนช่องค้นผู้ขายใน step ก่อนหน้า */}
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          onInputChange={setSearch}
          placeholder={t("searchProduct")}
          containerClassName="w-96"
          inputClassName="h-8 text-xs placeholder:text-xs"
        />
        {/* ไม่มี onSaveClick เพราะ saved view ผูกกับหน้า list ไม่ใช่ตารางใน wizard
            (เหตุผลเดียวกับตัวกรองรายการสินค้าของ PR) */}
        <ListFilter
          fields={filter.fields}
          values={filter.values}
          setValue={filter.setValue}
          onClearAll={filter.clearAll}
          activeCount={filter.activeCount}
        />
      </div>

      {activeCurrency && (
        <div
          className="border-warning/30 bg-warning/5 text-warning-foreground text-micro flex items-start gap-2 rounded-md border px-3 py-2"
          role="status"
          aria-live="polite"
        >
          <AlertTriangle
            aria-hidden="true"
            className="text-warning-ink mt-px size-3.5 shrink-0"
          />
          <span>
            {t("singleCurrencyHint", { currency: activeCurrency.code })}
          </span>
        </div>
      )}

      {error ? (
        <p className="text-destructive p-3 text-xs">
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : (
        <DataGrid
          table={table}
          recordCount={rows.length}
          isLoading={!disabled && isLoading}
          loadingMode="skeleton"
          tableLayout={{
            rowClamp: false,
            checkbox: true,
            headerSticky: true,
          }}
          emptyMessage={
            // กรอง/ค้นจนไม่เหลือแถว ≠ ผู้ขายรายนี้ไม่มีของ — ข้อความเดียวกันจะหลอก
            // ให้ถอยไปเปลี่ยนผู้ขายทั้งที่ของอยู่ครบ แค่ถูกซ่อน
            !disabled && (filter.activeCount > 0 || search.trim()) ? (
              <EmptyComponent
                icon={FilterX}
                title={tc("noSearchResult")}
                description={tl("noFoundDesc")}
              />
            ) : (
              <EmptyComponent
                title={t("noItemsAvailable")}
                description={t("noItemsAvailableDesc")}
              />
            )
          }
        >
          <DataGridContainer scroll className="max-h-96">
            <DataGridTable />
          </DataGridContainer>
        </DataGrid>
      )}

      {itemsErrorMessage && <FieldError>{itemsErrorMessage}</FieldError>}
    </Field>
  );
}
