import { useMemo } from "react";
import {
  Controller,
  useWatch,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { FieldInput } from "@/components/ui/field";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import { round2 } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { PriceList } from "@/types/price-list";
import type { PriceListFormValues } from "./pl-form-schema";

type DetailField = FieldArrayWithId<
  PriceListFormValues,
  "pricelist_detail",
  "id"
>;
type DetailRef = PriceList["pricelist_detail"][number];

interface PLProductTableProps {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly detailFields: DetailField[];
  readonly detailRefs?: PriceList["pricelist_detail"];
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onRemove: (idx: number) => void;
  readonly tfl: (key: string) => string;
  readonly removeLabel: string;
}

/**
 * Inline price-list table — TanStack DataGrid (project standard) ตัวเดียวกัน
 * ทั้ง view และ edit/add: column ชุดเดียว, แต่ละ cell branch `isView`
 * (plain text vs inputs/lookups) — actions column แสดงเฉพาะตอน edit
 */
export function PLProductTable({
  form,
  detailFields,
  detailRefs,
  isView,
  isDisabled,
  onRemove,
  tfl,
  removeLabel,
}: PLProductTableProps) {
  "use no memo";
  const columns = useMemo<ColumnDef<DetailField>[]>(() => {
    const cols: ColumnDef<DetailField>[] = [
      {
        id: "index",
        size: 40,
        header: () => "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground tabular-nums">
            {row.index + 1}
          </span>
        ),
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "product",
        header: () => tfl("product"),
        size: 300,
        cell: ({ row }) => (
          <ProductCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
            detailRef={detailRefs?.[row.index]}
          />
        ),
      },
      {
        id: "unit",
        header: () => tfl("unit"),
        cell: ({ row }) => (
          <UnitCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
            detailRef={detailRefs?.[row.index]}
          />
        ),
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "moq",
        size: 96,
        header: () => tfl("moq"),
        cell: ({ row }) => (
          <MoqCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
            detailRef={detailRefs?.[row.index]}
          />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "price",
        size: 128,
        header: () => tfl("unitPrice"),
        cell: ({ row }) => (
          <PriceCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
            detailRef={detailRefs?.[row.index]}
          />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "tax_profile",
        header: () => tfl("taxProfile"),
        cell: ({ row }) => (
          <TaxCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
            detailRef={detailRefs?.[row.index]}
          />
        ),
      },
      {
        id: "lead",
        size: 96,
        header: () => tfl("leadTime"),
        cell: ({ row }) => (
          <LeadCell
            form={form}
            index={row.index}
            isView={isView}
            isDisabled={isDisabled}
            detailRef={detailRefs?.[row.index]}
          />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
    ];

    if (!isView) {
      cols.push({
        id: "actions",
        size: 40,
        header: () => null,
        cell: ({ row }) =>
          isDisabled ? null : (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label={removeLabel}
              onClick={() => onRemove(row.index)}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
            >
              <X />
            </Button>
          ),
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      });
    }

    return cols;
  }, [form, isView, isDisabled, tfl, onRemove, removeLabel, detailRefs]);

  const table = useReactTable({
    data: detailFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={detailFields.length}
      tableLayout={{ headerSticky: true }}
    >
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}

/* ── Cells (view = plain text · edit = inputs/lookups) ─────────── */

/** count/min/max ของราคา (incl. tax) ทุก row — ใช้ highlight border สูง/ต่ำ */
function computePriceMinMax(
  details: PriceListFormValues["pricelist_detail"] | undefined,
) {
  const prices = (details ?? []).map((d) => {
    const noTax = Number(d?.price_without_tax) || 0;
    const rate = Number(d?.tax_rate) || 0;
    return round2(noTax + (noTax * rate) / 100);
  });
  const count = prices.length;
  return {
    count,
    min: count > 0 ? Math.min(...prices) : 0,
    max: count > 0 ? Math.max(...prices) : 0,
  };
}

function ProductCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly detailRef?: DetailRef;
}) {
  "use no memo";
  if (isView)
    return (
      <PlainProduct
        name={detailRef?.product_name}
        localName={detailRef?.product_local_name}
      />
    );
  const errors = form.formState.errors.pricelist_detail?.[index];
  return (
    <Controller
      control={form.control}
      name={`pricelist_detail.${index}.product_id`}
      render={({ field }) => (
        <LookupProduct
          value={field.value}
          onValueChange={field.onChange}
          disabled={isDisabled}
          className="h-8 w-full text-xs"
          error={errors?.product_id?.message}
        />
      )}
    />
  );
}

function UnitCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly detailRef?: DetailRef;
}) {
  "use no memo";
  const productId =
    useWatch({
      control: form.control,
      name: `pricelist_detail.${index}.product_id`,
    }) ?? "";
  if (isView) return <PlainText value={detailRef?.unit_name} />;
  const errors = form.formState.errors.pricelist_detail?.[index];
  return (
    <Controller
      control={form.control}
      name={`pricelist_detail.${index}.unit_id`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value}
          onValueChange={field.onChange}
          disabled={isDisabled}
          className="w-full text-xs"
          error={errors?.unit_id?.message}
        />
      )}
    />
  );
}

function MoqCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly detailRef?: DetailRef;
}) {
  "use no memo";
  if (isView)
    return (
      <span className="text-foreground text-xs font-semibold tabular-nums">
        {Number(detailRef?.moq_qty) || 0}+
      </span>
    );
  const errors = form.formState.errors.pricelist_detail?.[index];
  return (
    <FieldInput
      type="number"
      inputMode="decimal"
      min={0}
      disabled={isDisabled}
      placeholder="0"
      error={errors?.moq_qty?.message}
      className="border-border/60 h-8 w-full rounded-md text-right text-xs tabular-nums"
      {...form.register(`pricelist_detail.${index}.moq_qty`, {
        valueAsNumber: true,
      })}
    />
  );
}

function LeadCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly detailRef?: DetailRef;
}) {
  "use no memo";
  if (isView)
    return (
      <span className="text-muted-foreground text-xs tabular-nums">
        {Number(detailRef?.lead_time_days) || 0}d
      </span>
    );
  const errors = form.formState.errors.pricelist_detail?.[index];
  return (
    <FieldInput
      type="number"
      inputMode="decimal"
      min={0}
      disabled={isDisabled}
      placeholder="0"
      error={errors?.lead_time_days?.message}
      className="border-border/60 h-8 w-full rounded-md text-right text-xs tabular-nums"
      {...form.register(`pricelist_detail.${index}.lead_time_days`, {
        valueAsNumber: true,
      })}
    />
  );
}

function PriceCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly detailRef?: DetailRef;
}) {
  "use no memo";
  const priceWithoutTax = useWatch({
    control: form.control,
    name: `pricelist_detail.${index}.price_without_tax`,
  });
  const taxRate = useWatch({
    control: form.control,
    name: `pricelist_detail.${index}.tax_rate`,
  });
  // watch ทุก row เพื่อหา min/max ของราคา (incl. tax) สำหรับ highlight border
  // — คำนวณใน cell เอง แทนรับ `stats` ผ่าน column closure ที่ทำให้ columns
  // ถูกสร้างใหม่ทุก keystroke → cell remount → input หลุด focus
  const allDetails = useWatch({
    control: form.control,
    name: "pricelist_detail",
  });

  const numericPriceNoTax = Number(priceWithoutTax) || 0;
  const taxAmt = useMemo(
    () => round2((numericPriceNoTax * (Number(taxRate) || 0)) / 100),
    [numericPriceNoTax, taxRate],
  );
  const numericPrice = useMemo(
    () => round2(numericPriceNoTax + taxAmt),
    [numericPriceNoTax, taxAmt],
  );
  const { count, min, max } = useMemo(
    () => computePriceMinMax(allDetails),
    [allDetails],
  );
  const isHigh = count > 1 && numericPrice === max && min !== max;
  const isLow = count > 1 && numericPrice === min && min !== max;

  if (isView)
    return (
      <span className="text-foreground text-xs font-semibold tabular-nums">
        {(Number(detailRef?.price_without_tax) || 0).toFixed(2)}
      </span>
    );

  return (
    <div className="text-right">
      <FieldInput
        type="number"
        step="0.01"
        inputMode="decimal"
        min={0}
        disabled={isDisabled}
        placeholder="0.00"
        error={
          form.formState.errors.pricelist_detail?.[index]?.price_without_tax
            ?.message
        }
        className={cn(
          "border-border/60 h-8 w-full rounded-md pr-2 pl-6 text-right text-xs font-semibold tabular-nums",
          isHigh && "border-warning/60",
          isLow && "border-success/60",
        )}
        {...form.register(`pricelist_detail.${index}.price_without_tax`, {
          valueAsNumber: true,
        })}
      />
    </div>
  );
}

function TaxCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly detailRef?: DetailRef;
}) {
  "use no memo";
  if (isView) return <PlainText value={detailRef?.tax_profile_name} />;
  const errors = form.formState.errors.pricelist_detail?.[index];
  return (
    <Controller
      control={form.control}
      name={`pricelist_detail.${index}.tax_profile_id`}
      render={({ field }) => (
        <LookupTaxProfile
          value={field.value}
          onValueChange={(value, rate) => {
            field.onChange(value);
            form.setValue(`pricelist_detail.${index}.tax_rate`, rate);
          }}
          disabled={isDisabled}
          className="w-full text-xs"
          error={errors?.tax_profile_id?.message}
        />
      )}
    />
  );
}

/* ── Plain text helpers ─────────────────────── */

function PlainText({ value }: { readonly value?: string | null }) {
  "use no memo";
  if (!value)
    return (
      <span className="text-muted-foreground text-[0.6875rem] italic">—</span>
    );
  return <span className="text-foreground text-xs font-semibold">{value}</span>;
}

function PlainProduct({
  name,
  localName,
}: {
  readonly name?: string | null;
  readonly localName?: string | null;
}) {
  "use no memo";
  if (!name)
    return (
      <span className="text-muted-foreground text-[0.6875rem] italic">—</span>
    );
  return (
    <div className="flex flex-wrap items-baseline gap-1">
      <span className="text-foreground text-xs leading-tight font-semibold">
        {name}
      </span>
      {localName && (
        <span className="text-muted-foreground text-[0.625rem]">
          ({localName})
        </span>
      )}
    </div>
  );
}
