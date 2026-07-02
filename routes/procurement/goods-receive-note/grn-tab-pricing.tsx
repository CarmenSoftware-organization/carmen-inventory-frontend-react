import { useEffect, useMemo } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import type { GrnFormValues } from "./grn-form-schema";

interface GrnTabPricingProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
}

/**
 * ส่วน Pricing ของ expanded item row
 * ให้กรอก price, discount, tax และคำนวณ subtotal/net/tax/total แบบ real-time
 * รองรับ override tax_amount / discount_amount ผ่าน checkbox is_tax_adjustment
 *
 * @param props - props
 * @param props.form - UseFormReturn ของ GrnFormValues
 * @param props.index - ลำดับ item
 * @param props.disabled - ปิดการแก้ไข
 * @returns React element ของแท็บ pricing
 * @example
 * <GrnTabPricing form={form} index={itemIndex} disabled={isView} />
 */
export default function GrnTabPricing({
  form,
  index,
  disabled,
}: GrnTabPricingProps) {
  "use no memo";
  const tfl = useTranslations("field");

  const [
    watchUnitPrice,
    watchReceivedQty,
    watchTaxRate,
    watchIsTaxAdj,
    watchTaxAmt,
    watchDiscRate,
    watchIsDiscAdj,
    watchDiscAmt,
  ] = useWatch({
    control: form.control,
    name: [
      `items.${index}.unit_price`,
      `items.${index}.received_qty`,
      `items.${index}.tax_rate`,
      `items.${index}.is_tax_adjustment`,
      `items.${index}.tax_amount`,
      `items.${index}.discount_rate`,
      `items.${index}.is_discount_adjustment`,
      `items.${index}.discount_amount`,
    ] as const,
  });

  // NaN guard: valueAsNumber produces NaN on empty inputs; NaN !== NaN breaks deps
  const unitPrice = Number(watchUnitPrice) || 0;
  const receivedQty = Number(watchReceivedQty) || 0;
  const taxRate = Number(watchTaxRate) || 0;
  const isTaxAdj = watchIsTaxAdj ?? false;
  const taxAmt = Number(watchTaxAmt) || 0;
  const discRate = Number(watchDiscRate) || 0;
  const isDiscAdj = watchIsDiscAdj ?? false;
  const discAmt = Number(watchDiscAmt) || 0;

  const { subtotal, discountAmount, netAmount, taxAmount, totalPrice } =
    useMemo(() => {
      const sub = round2(unitPrice * receivedQty);
      const disc = isDiscAdj ? discAmt : round2((sub * discRate) / 100);
      const net = round2(sub - disc);
      const tax = isTaxAdj ? taxAmt : round2((net * taxRate) / 100);
      const total = round2(net + tax);
      return {
        subtotal: sub,
        discountAmount: disc,
        netAmount: net,
        taxAmount: tax,
        totalPrice: total,
      };
    }, [
      unitPrice,
      receivedQty,
      discRate,
      isDiscAdj,
      discAmt,
      taxRate,
      isTaxAdj,
      taxAmt,
    ]);

  useEffect(() => {
    if (!isDiscAdj) {
      const cur = form.getValues(`items.${index}.discount_amount`);
      if (cur !== discountAmount) {
        form.setValue(`items.${index}.discount_amount`, discountAmount);
      }
    }
    if (!isTaxAdj) {
      const cur = form.getValues(`items.${index}.tax_amount`);
      if (cur !== taxAmount) {
        form.setValue(`items.${index}.tax_amount`, taxAmount);
      }
    }
    const curNet = form.getValues(`items.${index}.net_amount`);
    if (curNet !== netAmount) {
      form.setValue(`items.${index}.net_amount`, netAmount);
    }
    const curTotal = form.getValues(`items.${index}.total_price`);
    if (curTotal !== totalPrice) {
      form.setValue(`items.${index}.total_price`, totalPrice);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [
    index,
    discountAmount,
    taxAmount,
    netAmount,
    totalPrice,
    isDiscAdj,
    isTaxAdj,
  ]);

  return (
    <div className="space-y-4">
      {/* Unit price + tax profile + rate */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`items-${index}-unit-price`} className="text-xs">
            {tfl("unitPrice")}
          </FieldLabel>
          <Input
            id={`items-${index}-unit-price`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            className="h-8 text-right text-xs"
            disabled={disabled}
            {...form.register(`items.${index}.unit_price`, {
              valueAsNumber: true,
            })}
          />
        </Field>
        <Field>
          <FieldLabel className="text-xs">{tfl("taxProfile")}</FieldLabel>
          <Controller
            control={form.control}
            name={`items.${index}.tax_profile_id`}
            render={({ field }) => (
              <LookupTaxProfile
                value={field.value ?? ""}
                onValueChange={(value, rate) => {
                  field.onChange(value || null);
                  form.setValue(`items.${index}.tax_rate`, rate);
                }}
                disabled={disabled}
                className="h-8 w-full text-xs"
              />
            )}
          />
        </Field>
      </div>

      {/* Adjustment amounts — tax & discount on one line */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel
              htmlFor={`items-${index}-tax-amount`}
              className="text-xs"
            >
              {tfl("taxAmt")}
            </FieldLabel>
            <Controller
              control={form.control}
              name={`items.${index}.is_tax_adjustment`}
              render={({ field }) => (
                <label className="flex cursor-pointer items-center gap-1">
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                    disabled={disabled}
                    className="size-3.5"
                  />
                  <span className="text-muted-foreground text-[0.6875rem] select-none">
                    {tfl("override")}
                  </span>
                </label>
              )}
            />
          </div>
          <Input
            id={`items-${index}-tax-amount`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            className="h-8 text-right text-xs"
            disabled={disabled || !isTaxAdj}
            {...form.register(`items.${index}.tax_amount`, {
              valueAsNumber: true,
            })}
          />
        </Field>

        {/* Discount row — % and amount equal width */}
        <div className="grid grid-cols-2 gap-2">
          <Field>
            <FieldLabel
              htmlFor={`items-${index}-discount-rate`}
              className="text-xs"
            >
              {tfl("discPercent")}
            </FieldLabel>
            <Input
              id={`items-${index}-discount-rate`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0"
              className="h-8 text-right text-xs"
              disabled={disabled}
              {...form.register(`items.${index}.discount_rate`, {
                valueAsNumber: true,
              })}
            />
          </Field>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel
                htmlFor={`items-${index}-discount-amount`}
                className="text-xs"
              >
                {tfl("discAmt")}
              </FieldLabel>
              <Controller
                control={form.control}
                name={`items.${index}.is_discount_adjustment`}
                render={({ field }) => (
                  <label className="flex cursor-pointer items-center gap-1">
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                      className="size-3.5"
                    />
                    <span className="text-muted-foreground text-[0.6875rem] select-none">
                      {tfl("override")}
                    </span>
                  </label>
                )}
              />
            </div>
            <Input
              id={`items-${index}-discount-amount`}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="0.00"
              className="h-8 text-right text-xs"
              disabled={disabled || !isDiscAdj}
              {...form.register(`items.${index}.discount_amount`, {
                valueAsNumber: true,
              })}
            />
          </Field>
        </div>
      </div>

      {/* ── Summary (live) ── */}
      <div className="space-y-2 border-t pt-3 text-sm tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{tfl("subtotal")}</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {tfl("discAmt")}
            {!isDiscAdj && discRate > 0 && (
              <span className="ml-1 text-xs">({discRate}%)</span>
            )}
          </span>
          <span className={discountAmount > 0 ? "text-destructive" : ""}>
            {discountAmount > 0
              ? `-${formatCurrency(discountAmount)}`
              : formatCurrency(0)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{tfl("netAmount")}</span>
          <span className="font-semibold">{formatCurrency(netAmount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {tfl("taxAmt")}
            {!isTaxAdj && taxRate > 0 && (
              <span className="ml-1 text-xs">({taxRate}%)</span>
            )}
          </span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm font-semibold">{tfl("total")}</span>
          <span className="text-foreground text-base font-semibold">
            {formatCurrency(totalPrice)}
          </span>
        </div>
      </div>
    </div>
  );
}
