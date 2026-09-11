import {
  Controller,
  useFormState,
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

function useRowErrors(form: UseFormReturn<PriceListFormValues>, index: number) {
  "use no memo";
  const { errors } = useFormState({
    control: form.control,
    name: `pricelist_detail.${index}`,
  });
  return errors.pricelist_detail?.[index];
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
  const errors = useRowErrors(form, index);
  if (isView)
    return (
      <NameWithSubtext
        primary={detailRef?.product_name ?? ""}
        secondary={detailRef?.product_local_name}
      />
    );
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
  const errors = useRowErrors(form, index);
  const productId =
    useWatch({
      control: form.control,
      name: `pricelist_detail.${index}.product_id`,
    }) ?? "";
  if (isView) return <FieldPlainText>{detailRef?.unit_name}</FieldPlainText>;
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
  const errors = useRowErrors(form, index);
  if (isView)
    return (
      <span className="text-foreground text-xs font-semibold tabular-nums">
        {Number(detailRef?.moq_qty) || 0}+
      </span>
    );
  return (
    <FieldInput
      errorIconAlign="left"
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
  const errors = useRowErrors(form, index);
  if (isView)
    return (
      <span className="text-muted-foreground text-xs tabular-nums">
        {Number(detailRef?.lead_time_days) || 0}d
      </span>
    );
  return (
    <FieldInput
      errorIconAlign="left"
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
  const errors = useRowErrors(form, index);

  if (isView)
    return (
      <span className="text-foreground text-xs font-semibold tabular-nums">
        {(Number(detailRef?.price) || 0).toFixed(2)}
      </span>
    );

  return (
    <div className="text-right">
      <FieldInput
        errorIconAlign="left"
        type="number"
        step="0.01"
        inputMode="decimal"
        min={0}
        disabled={isDisabled}
        placeholder="0.00"
        error={errors?.price?.message}
        className="text-right"
        {...form.register(`pricelist_detail.${index}.price`, {
          valueAsNumber: true,
        })}
      />
    </div>
  );
}

/**
 * ดึง price (gross) + tax_rate ของ row (view=detailRef · edit=watch สด) แล้ว
 * derive PWT (ก่อนภาษี) + tax amount กลับ — input คือ price รวมภาษี
 */
function useRowPriceParts(
  form: UseFormReturn<PriceListFormValues>,
  index: number,
  isView: boolean,
  detailRef?: DetailRef,
) {
  const priceWatch = useWatch({
    control: form.control,
    name: `pricelist_detail.${index}.price`,
  });
  const rateWatch = useWatch({
    control: form.control,
    name: `pricelist_detail.${index}.tax_rate`,
  });
  const priceGross = isView
    ? Number(detailRef?.price) || 0
    : Number(priceWatch) || 0;
  const rate = isView
    ? Number(detailRef?.tax_rate) || 0
    : Number(rateWatch) || 0;
  const pwt = round2(priceGross / (1 + rate / 100));
  return {
    priceGross,
    pwt,
    taxAmt: round2(priceGross - pwt),
    amount: priceGross,
  };
}

/** PWT — ราคาก่อนภาษี (computed จาก price ÷ (1+rate), read-only) */
export function PWTCell({ form, index, isView, detailRef }: CellProps) {
  "use no memo";
  const { pwt } = useRowPriceParts(form, index, isView, detailRef);
  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {pwt.toFixed(2)}
    </span>
  );
}

/** Amount — ราคารวมภาษี (= price gross, read-only) ทั้ง view/edit */
export function AmountCell({ form, index, isView, detailRef }: CellProps) {
  "use no memo";
  const { amount } = useRowPriceParts(form, index, isView, detailRef);
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {amount.toFixed(2)}
    </span>
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
      <Crown
        className="text-warning-ink mx-auto size-3.5"
        aria-label="preferred"
      />
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
  const errors = useRowErrors(form, index);
  if (isView)
    return <FieldPlainText>{detailRef?.tax_profile_name}</FieldPlainText>;
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
