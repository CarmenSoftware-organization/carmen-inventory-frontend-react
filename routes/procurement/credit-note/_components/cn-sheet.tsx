"use no memo";

import { useEffect, useMemo } from "react";
import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Field,
  FieldGroup,
  FieldInput,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LookupGrnProduct } from "@/components/lookup/lookup-grn-product";
import { LookupGrnProductLocation } from "@/components/lookup/lookup-grn-product-location";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { round2, formatCurrency } from "@/lib/currency-utils";
import type { GrnProductItem } from "@/types/goods-receive-note";
import type { CnFormValues } from "./cn-form-schema";

interface CnSheetProps {
  readonly form: UseFormReturn<CnFormValues>;
  readonly itemIndex: number;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly disabled: boolean;
}

export function CnSheet({
  form,
  itemIndex,
  open,
  onOpenChange,
  disabled,
}: CnSheetProps) {
  const tfl = useTranslations("field");
  const t = useTranslations("procurement.creditNote");

  const productName =
    useWatch({
      control: form.control,
      name: `items.${itemIndex}.item_name`,
    }) ?? "";

  const grnId =
    useWatch({ control: form.control, name: "grn_id" }) || undefined;

  const productId =
    useWatch({
      control: form.control,
      name: `items.${itemIndex}.item_id`,
    }) ?? "";

  const [rawQty, rawPrice, rawTaxRate] = useWatch({
    control: form.control,
    name: [
      `items.${itemIndex}.quantity`,
      `items.${itemIndex}.unit_price`,
      `items.${itemIndex}.tax_rate`,
    ],
  });

  // Normalize NaN to 0 — NaN !== NaN would cause infinite useMemo recalculation
  const qty = Number(rawQty) || 0;
  const price = Number(rawPrice) || 0;
  const taxRate = Number(rawTaxRate) || 0;

  const itemErrors = form.formState.errors.items?.[itemIndex];
  const qtyError = itemErrors?.quantity?.message;
  const unitError = itemErrors?.unit_id?.message;
  const priceError = itemErrors?.unit_price?.message;

  const { netAmount, taxAmount, totalAmount } = useMemo(() => {
    const net = round2(qty * price);
    const tax = round2((net * taxRate) / 100);
    const total = round2(net + tax);
    return { netAmount: net, taxAmount: tax, totalAmount: total };
  }, [qty, price, taxRate]);

  useEffect(() => {
    form.setValue(`items.${itemIndex}.net_amount`, netAmount);
    form.setValue(`items.${itemIndex}.tax_amount`, taxAmount);
    form.setValue(`items.${itemIndex}.total_amount`, totalAmount);
  }, [netAmount, taxAmount, totalAmount, form, itemIndex]);

  const handleProductChange = (value: string, product?: GrnProductItem) => {
    const opts = { shouldDirty: true };
    form.setValue(`items.${itemIndex}.item_id`, value, opts);
    form.setValue(
      `items.${itemIndex}.item_name`,
      product?.product_name ?? "",
      opts,
    );
    form.setValue(`items.${itemIndex}.location_id`, null, opts);
    form.setValue(`items.${itemIndex}.location_name`, "", opts);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader className="animate-fade-in-left pt-12">
          <SheetTitle className="text-sm">
            {productName || tfl("product")}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {tfl("details")}
          </SheetDescription>
        </SheetHeader>

        <div className="animate-fade-in-left space-y-4 px-4 pt-2 [animation-delay:75ms]">
          <FieldGroup className="gap-3">
            {/* Product */}
            <Field>
              <FieldLabel required>{tfl("product")}</FieldLabel>
              <Controller
                control={form.control}
                name={`items.${itemIndex}.item_id`}
                render={({ field, fieldState }) => (
                  <LookupGrnProduct
                    grnId={grnId}
                    value={field.value ?? ""}
                    onValueChange={(val, product) =>
                      handleProductChange(val, product)
                    }
                    disabled={disabled}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </Field>

            {/* Location */}
            <Field>
              <FieldLabel>{tfl("location")}</FieldLabel>
              <Controller
                control={form.control}
                name={`items.${itemIndex}.location_id`}
                render={({ field, fieldState }) => (
                  <LookupGrnProductLocation
                    grnId={grnId}
                    productId={productId || undefined}
                    value={field.value ?? ""}
                    onValueChange={(value, location) => {
                      field.onChange(value);
                      form.setValue(
                        `items.${itemIndex}.location_name`,
                        location?.location_name ?? "",
                      );
                    }}
                    disabled={disabled || !productId}
                    error={fieldState.error?.message}
                  />
                )}
              />
            </Field>

            {/* Quantity + Unit */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel required>{tfl("quantity")}</FieldLabel>
                <FieldInput
                  type="number"
                  inputMode="decimal"
                  min={1}
                  step="0.01"
                  placeholder="0.00"
                  className={`h-8 text-right text-sm ${qtyError ? "pl-7" : ""}`}
                  disabled={disabled}
                  error={qtyError}
                  errorIconAlign="left"
                  {...form.register(`items.${itemIndex}.quantity`, {
                    valueAsNumber: true,
                  })}
                />
              </Field>
              <Field>
                <FieldLabel required>{tfl("unit")}</FieldLabel>
                <Controller
                  control={form.control}
                  name={`items.${itemIndex}.unit_id`}
                  render={({ field, fieldState }) => (
                    <LookupProductUnit
                      productId={productId}
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      onItemChange={(unit) => {
                        form.setValue(
                          `items.${itemIndex}.unit_name`,
                          unit?.name ?? "",
                        );
                      }}
                      disabled={disabled || !productId}
                      className="h-8 w-full text-xs"
                      error={fieldState.error?.message ?? unitError}
                    />
                  )}
                />
              </Field>
            </div>

            {/* Price + Tax Rate */}
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>{tfl("price")}</FieldLabel>
                <FieldInput
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  className={`h-8 text-right text-sm ${priceError ? "pl-7" : ""}`}
                  disabled={disabled}
                  error={priceError}
                  errorIconAlign="left"
                  {...form.register(`items.${itemIndex}.unit_price`, {
                    valueAsNumber: true,
                  })}
                />
              </Field>
              <Field>
                <FieldLabel>{tfl("tax")} %</FieldLabel>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  className="h-8 text-right text-sm"
                  disabled={disabled}
                  {...form.register(`items.${itemIndex}.tax_rate`, {
                    valueAsNumber: true,
                  })}
                />
              </Field>
            </div>

            {/* Computed amounts */}
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel>{tfl("netAmount")}</FieldLabel>
                <Input
                  value={formatCurrency(netAmount)}
                  disabled
                  readOnly
                  className="h-8 text-right text-sm"
                />
              </Field>
              <Field>
                <FieldLabel>{tfl("taxAmt")}</FieldLabel>
                <Input
                  value={formatCurrency(taxAmount)}
                  disabled
                  readOnly
                  className="h-8 text-right text-sm"
                />
              </Field>
              <Field>
                <FieldLabel>{tfl("totalAmount")}</FieldLabel>
                <Input
                  value={formatCurrency(totalAmount)}
                  disabled
                  readOnly
                  className="h-8 text-right text-sm font-semibold"
                />
              </Field>
            </div>

            {/* Tax Adjustment */}
            <Field>
              <div className="flex items-center gap-2">
                <Controller
                  control={form.control}
                  name={`items.${itemIndex}.is_tax_adjustment`}
                  render={({ field }) => (
                    <Checkbox
                      id={`is-tax-adjustment-${itemIndex}`}
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={disabled}
                    />
                  )}
                />
                <FieldLabel
                  htmlFor={`is-tax-adjustment-${itemIndex}`}
                  className="mb-0"
                >
                  {t("taxAdjustment")}
                </FieldLabel>
              </div>
            </Field>

            {/* Description */}
            <Field>
              <FieldLabel>{tfl("description")}</FieldLabel>
              <Textarea
                placeholder={tfl("optional")}
                className="min-h-13 text-xs"
                rows={2}
                disabled={disabled}
                maxLength={256}
                {...form.register(`items.${itemIndex}.description`)}
              />
            </Field>
          </FieldGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
}
