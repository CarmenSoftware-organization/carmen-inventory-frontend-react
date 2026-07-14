import { useMemo } from "react";
import {
  Controller,
  useWatch,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import { Crown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldInput, FieldPlainText } from "@/components/ui/field";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import { round2 } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { PriceList } from "@/types/price-list";
import type { PriceListFormValues } from "./pl-form-schema";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";

export type DetailField = FieldArrayWithId<
  PriceListFormValues,
  "pricelist_detail",
  "id"
>;
export type DetailRef = PriceList["pricelist_detail"][number];

interface CellProps {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly index: number;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly detailRef?: DetailRef;
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

export function ProductCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
  confirmDuplicate,
}: CellProps & {
  readonly confirmDuplicate: (action: () => void, productName?: string) => void;
}) {
  "use no memo";
  if (isView)
    return (
      <NameWithSubtext
        primary={detailRef?.product_name ?? ""}
        secondary={detailRef?.product_local_name}
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
          onValueChange={(id, product) => {
            const rows = form.getValues("pricelist_detail");
            const isDup =
              !!id && rows.some((r, i) => i !== index && r.product_id === id);
            if (isDup)
              confirmDuplicate(() => field.onChange(id), product?.name);
            else field.onChange(id);
          }}
          disabled={isDisabled}
          className="h-8 w-full text-xs"
          error={errors?.product_id?.message}
        />
      )}
    />
  );
}

export function UnitCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: CellProps) {
  "use no memo";
  const productId =
    useWatch({
      control: form.control,
      name: `pricelist_detail.${index}.product_id`,
    }) ?? "";
  if (isView)
    return <FieldPlainText>{detailRef?.unit_name}</FieldPlainText>;
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

export function MoqCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: CellProps) {
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

export function LeadCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: CellProps) {
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

export function PriceCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: CellProps) {
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

/** Preferred — view: Crown เมื่อ preferred · edit: checkbox toggle ต่อ item */
export function PreferredCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: CellProps) {
  "use no memo";
  if (isView)
    return detailRef?.is_preferred ? (
      <Crown className="text-warning mx-auto size-3.5" aria-label="preferred" />
    ) : (
      <span className="text-muted-foreground/50">—</span>
    );
  return (
    <div className="flex justify-center">
      <Controller
        control={form.control}
        name={`pricelist_detail.${index}.is_preferred`}
        render={({ field }) => (
          <Checkbox
            checked={!!field.value}
            onCheckedChange={(v) => field.onChange(v === true)}
            disabled={isDisabled}
            aria-label="preferred"
          />
        )}
      />
    </div>
  );
}

export function TaxCell({
  form,
  index,
  isView,
  isDisabled,
  detailRef,
}: CellProps) {
  "use no memo";
  if (isView)
    return <FieldPlainText>{detailRef?.tax_profile_name}</FieldPlainText>;
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
