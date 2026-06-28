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
 * Inline price-list table — TanStack DataGrid (project standard) สำหรับ edit/add
 * และ grouped rowspan view (merge tier ราคาของ product เดียวกัน) สำหรับ view mode
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
        cell: ({ row }) => <span>{row.index + 1}</span>,
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "product",
        header: () => tfl("product"),
        cell: ({ row }) => (
          <ProductCell form={form} index={row.index} isDisabled={isDisabled} />
        ),
        size: 300,
      },
      {
        id: "unit",
        header: () => tfl("unit"),
        cell: ({ row }) => (
          <UnitCell form={form} index={row.index} isDisabled={isDisabled} />
        ),
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "moq",
        size: 96,
        header: () => tfl("moq"),
        cell: ({ row }) => (
          <MoqCell form={form} index={row.index} isDisabled={isDisabled} />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "price",
        size: 128,
        header: () => tfl("unitPrice"),
        cell: ({ row }) => (
          <PriceCell form={form} index={row.index} isDisabled={isDisabled} />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "tax_profile",
        header: () => tfl("taxProfile"),
        cell: ({ row }) => (
          <TaxCell form={form} index={row.index} isDisabled={isDisabled} />
        ),
      },
      {
        id: "lead",
        size: 96,
        header: () => tfl("leadTime"),
        cell: ({ row }) => (
          <LeadCell form={form} index={row.index} isDisabled={isDisabled} />
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
    ];

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

    return cols;
  }, [form, isDisabled, tfl, onRemove, removeLabel]);

  const table = useReactTable({
    data: detailFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // View mode — merge row ของ product เดียวกัน (rowspan) แสดง tier ราคาหลายระดับ
  if (isView) {
    return <PLProductViewTable detailRefs={detailRefs} tfl={tfl} />;
  }

  return (
    <DataGrid
      table={table}
      recordCount={detailFields.length}
      tableLayout={{ headerSticky: true }}
    >
      <DataGridContainer
        className="border-border/60 bg-card"
        border={false}
      >
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}

/* ── View: grouped rowspan table ───────────────── */

interface PriceTierGroup {
  readonly productId: string;
  readonly productName?: string | null;
  readonly localName?: string | null;
  readonly tiers: DetailRef[];
}

/** group ตาม product_id (เรียงตามลำดับที่เจอ) + เรียง tier ตาม moq น้อย→มาก */
function groupDetailsByProduct(
  details: readonly DetailRef[],
): PriceTierGroup[] {
  const map = new Map<string, PriceTierGroup>();
  const order: string[] = [];
  for (const d of details) {
    let group = map.get(d.product_id);
    if (!group) {
      group = {
        productId: d.product_id,
        productName: d.product_name,
        localName: d.product_local_name,
        tiers: [],
      };
      map.set(d.product_id, group);
      order.push(d.product_id);
    }
    group.tiers.push(d);
  }
  for (const group of map.values()) {
    group.tiers.sort((a, b) => (Number(a.moq_qty) || 0) - (Number(b.moq_qty) || 0));
  }
  return order.map((id) => map.get(id)!);
}

/** count/min/max ของราคา (incl. tax) ทุก tier — ใช้ highlight สูง/ต่ำ */
function computeRefMinMax(details: readonly DetailRef[]) {
  const prices = details.map((d) => round2(Number(d.price) || 0));
  const count = prices.length;
  return {
    count,
    min: count > 0 ? Math.min(...prices) : 0,
    max: count > 0 ? Math.max(...prices) : 0,
  };
}

function PLProductViewTable({
  detailRefs,
  tfl,
}: {
  readonly detailRefs?: PriceList["pricelist_detail"];
  readonly tfl: (key: string) => string;
}) {
  "use no memo";
  const details = useMemo(() => detailRefs ?? [], [detailRefs]);
  const groups = useMemo(() => groupDetailsByProduct(details), [details]);
  const { count, min, max } = useMemo(
    () => computeRefMinMax(details),
    [details],
  );

  return (
    <div className="border-border/60 bg-card overflow-hidden rounded-lg border">
      <table className="w-full text-xs">
        <thead className="bg-muted/60 text-foreground border-b">
          <tr>
            <th scope="col" className="w-10 px-2 py-2 text-center font-semibold">
              #
            </th>
            <th scope="col" className="px-3 py-2 text-left font-semibold">
              {tfl("product")}
            </th>
            <th scope="col" className="w-20 px-3 py-2 text-right font-semibold">
              {tfl("moq")}
            </th>
            <th scope="col" className="px-3 py-2 text-center font-semibold">
              {tfl("unit")}
            </th>
            <th scope="col" className="w-24 px-3 py-2 text-right font-semibold">
              {tfl("unitPrice")}
            </th>
            <th scope="col" className="w-20 px-3 py-2 text-right font-semibold">
              {tfl("tax")}
            </th>
            <th scope="col" className="w-24 px-3 py-2 text-right font-semibold">
              {tfl("total")}
            </th>
            <th scope="col" className="w-20 px-3 py-2 text-right font-semibold">
              {tfl("leadTime")}
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIndex) =>
            group.tiers.map((tier, tierIndex) => {
              const inclPrice = round2(Number(tier.price) || 0);
              const isHigh = count > 1 && inclPrice === max && min !== max;
              const isLow = count > 1 && inclPrice === min && min !== max;
              return (
                <tr
                  key={tier.id}
                  className="border-border/40 border-t align-top"
                >
                  {tierIndex === 0 && (
                    <td
                      rowSpan={group.tiers.length}
                      className="text-muted-foreground px-2 py-1.5 text-center font-semibold tabular-nums"
                    >
                      {groupIndex + 1}
                    </td>
                  )}
                  {tierIndex === 0 && (
                    <td rowSpan={group.tiers.length} className="px-3 py-1.5">
                      <PlainProduct
                        name={group.productName}
                        localName={group.localName}
                      />
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {Number(tier.moq_qty) || 0}+
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <PlainText value={tier.unit_name} />
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {(Number(tier.price_without_tax) || 0).toFixed(2)}
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 text-right tabular-nums">
                    {(Number(tier.tax_amt) || 0).toFixed(2)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-1.5 text-right font-semibold tabular-nums",
                      isHigh && "text-warning-foreground",
                      isLow && "text-success",
                    )}
                  >
                    {inclPrice.toFixed(2)}
                  </td>
                  <td className="text-muted-foreground px-3 py-1.5 text-right tabular-nums">
                    {Number(tier.lead_time_days) || 0}d
                  </td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Edit cells ────────────────────────────────── */

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
  isDisabled,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isDisabled: boolean;
}) {
  "use no memo";
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
  isDisabled,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isDisabled: boolean;
}) {
  "use no memo";
  const productId =
    useWatch({
      control: form.control,
      name: `pricelist_detail.${index}.product_id`,
    }) ?? "";
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
  isDisabled,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isDisabled: boolean;
}) {
  "use no memo";
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
  isDisabled,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isDisabled: boolean;
}) {
  "use no memo";
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
  isDisabled,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isDisabled: boolean;
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
  isDisabled,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isDisabled: boolean;
}) {
  "use no memo";
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
