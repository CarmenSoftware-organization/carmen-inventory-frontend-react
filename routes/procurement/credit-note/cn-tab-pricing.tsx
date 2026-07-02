import { useEffect, useMemo } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import type { CnFormValues } from "./cn-form-schema";

interface CnTabPricingProps {
  readonly form: UseFormReturn<CnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
}

/**
 * ส่วน Pricing ของ expanded item row (CN)
 * ให้กรอก unit price + tax % และคำนวณ net/tax/total แบบ real-time
 * is_tax_adjustment เป็น flag ที่บันทึกอย่างเดียว — ไม่เปลี่ยนสูตรคำนวณ
 *
 * @param props - props
 * @param props.form - UseFormReturn ของ CnFormValues
 * @param props.index - ลำดับ item
 * @param props.disabled - ปิดการแก้ไข
 * @returns React element ของแท็บ pricing
 * @example
 * <CnTabPricing form={form} index={itemIndex} disabled={isView} />
 */
export default function CnTabPricing({
  form,
  index,
  disabled,
}: CnTabPricingProps) {
  "use no memo";
  const tfl = useTranslations("field");

  const [watchUnitPrice, watchQty, watchTaxRate] = useWatch({
    control: form.control,
    name: [
      `items.${index}.unit_price`,
      `items.${index}.quantity`,
      `items.${index}.tax_rate`,
    ] as const,
  });

  // NaN guard: valueAsNumber produces NaN on empty inputs; NaN !== NaN breaks deps
  const unitPrice = Number(watchUnitPrice) || 0;
  const qty = Number(watchQty) || 0;
  const taxRate = Number(watchTaxRate) || 0;

  const { netAmount, taxAmount, totalAmount } = useMemo(() => {
    const net = round2(qty * unitPrice);
    const tax = round2((net * taxRate) / 100);
    const total = round2(net + tax);
    return { netAmount: net, taxAmount: tax, totalAmount: total };
  }, [qty, unitPrice, taxRate]);

  useEffect(() => {
    const curNet = form.getValues(`items.${index}.net_amount`);
    if (curNet !== netAmount) {
      form.setValue(`items.${index}.net_amount`, netAmount);
    }
    const curTax = form.getValues(`items.${index}.tax_amount`);
    if (curTax !== taxAmount) {
      form.setValue(`items.${index}.tax_amount`, taxAmount);
    }
    const curTotal = form.getValues(`items.${index}.total_amount`);
    if (curTotal !== totalAmount) {
      form.setValue(`items.${index}.total_amount`, totalAmount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [index, netAmount, taxAmount, totalAmount]);

  return (
    <div className="space-y-4">
      {/* Unit price + tax rate */}
      <div className="grid grid-cols-2 gap-3">
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
          <div className="flex items-center justify-between">
            <FieldLabel
              htmlFor={`items-${index}-tax-rate`}
              className="text-xs"
            >
              {tfl("tax")} %
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
            id={`items-${index}-tax-rate`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0"
            className="h-8 text-right text-xs"
            disabled={disabled}
            {...form.register(`items.${index}.tax_rate`, {
              valueAsNumber: true,
            })}
          />
        </Field>
      </div>

      {/* ── Summary (live) ── */}
      <div className="space-y-2 border-t pt-3 text-sm tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{tfl("subtotal")}</span>
          <span className="font-semibold">{formatCurrency(netAmount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">
            {tfl("taxAmt")}
            {taxRate > 0 && <span className="ml-1 text-xs">({taxRate}%)</span>}
          </span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex items-center justify-between border-t pt-2">
          <span className="text-sm font-semibold">{tfl("total")}</span>
          <span className="text-foreground text-base font-semibold">
            {formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
}
