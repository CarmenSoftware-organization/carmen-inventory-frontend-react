import { useState, useEffect } from "react";
import {
  Controller,
  useWatch,
  type UseFormReturn,
  type FieldArrayWithId,
} from "react-hook-form";
import { lazy, Suspense } from "react";
import { useTranslations } from "use-intl";
import { Scale } from "lucide-react";
import { STAGE_ROLE } from "@/types/stage-role";
import { PR_ITEM_PRICELIST_COMPARE_TYPE } from "@/types/purchase-request";
import { Field, FieldInput, FieldLabel } from "@/components/ui/field";
import { InputAmount } from "@/components/ui/input/input-amount";
import { formatCurrency } from "@/lib/currency-utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import { computePrItemAmounts, type PrFormValues } from "./pr-form-schema";
import type { PricelistEntry } from "./pr-pricelist-dialog";
import PrInventoryRow from "./pr-inventory-row";
import { PrItemSummary } from "./pr-item-summary";
import { formatDate } from "@/lib/date-utils";

// แทน next/dynamic ด้วย React.lazy (code-split เหมือนเดิม)
const PrPricelistDialog = lazy(() =>
  import("./pr-pricelist-dialog").then((mod) => ({ default: mod.PrPricelistDialog })),
);

type ItemField = FieldArrayWithId<PrFormValues, "items", "id">;

interface PrItemExpandProps {
  readonly item: ItemField;
  readonly form: UseFormReturn<PrFormValues>;
  readonly isDisabled: boolean;
  readonly itemFields: ItemField[];
  readonly buCode?: string;
  readonly baseCurrencyCode?: string;
  readonly role?: string;
}

export function PrItemExpand({
  item,
  form,
  isDisabled,
  itemFields,
  buCode,
  baseCurrencyCode,
  role,
}: PrItemExpandProps) {
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const index = itemFields.findIndex((f) => f.id === item.id);
  const [showPricelist, setShowPricelist] = useState(false);

  const i = Math.max(index, 0);
  // editable คุมด้วย isDisabled (view/pending) เท่านั้น — ไม่อิง
  // current_stage_status ซึ่งเป็นค่า dynamic ของ workflow
  const isFieldDisabled = isDisabled;

  const [
    watchPrice,
    watchQty,
    watchTaxRate,
    watchIsTaxAdj,
    watchTaxAmt,
    watchDiscRate,
    watchIsDiscAdj,
    watchDiscAmt,
    watchPricelistNo,
    watchProductId,
    watchProductName,
    watchUnitId,
    watchCurrencyId,
    watchDeliveryDate,
    watchRequestedUnitName,
    watchApprovedQty,
    watchApprovedUnitName,
    watchCurrencyCode,
    watchCurrencyDecimals,
    watchExchangeRate,
    watchVendorName,
    watchTaxProfileName,
  ] = useWatch({
    control: form.control,
    name: [
      `items.${i}.pricelist_price`,
      `items.${i}.requested_qty`,
      `items.${i}.tax_rate`,
      `items.${i}.is_tax_adjustment`,
      `items.${i}.tax_amount`,
      `items.${i}.discount_rate`,
      `items.${i}.is_discount_adjustment`,
      `items.${i}.discount_amount`,
      `items.${i}.pricelist_no`,
      `items.${i}.product_id`,
      `items.${i}.product_name`,
      `items.${i}.requested_unit_id`,
      `items.${i}.currency_id`,
      `items.${i}.delivery_date`,
      `items.${i}.requested_unit_name`,
      `items.${i}.approved_qty`,
      `items.${i}.approved_unit_name`,
      `items.${i}.currency_code`,
      `items.${i}.currency_decimal_places`,
      `items.${i}.exchange_rate`,
      `items.${i}.vendor_name`,
      `items.${i}.tax_profile_name`,
    ] as const,
  });

  const price = watchPrice ?? 0;
  const qty = watchQty ?? 0;
  const taxRate = watchTaxRate ?? 0;
  const isTaxAdj = watchIsTaxAdj ?? false;
  const taxAmt = watchTaxAmt ?? 0;
  const discRate = watchDiscRate ?? 0;
  const isDiscAdj = watchIsDiscAdj ?? false;
  const discAmt = watchDiscAmt ?? 0;
  const approvedQty = watchApprovedQty ?? 0;
  const calcQty = approvedQty > 0 ? approvedQty : qty;
  const currencyCode = watchCurrencyCode ?? null;
  const exchangeRate = watchExchangeRate ?? 1;
  const isForeignCurrency =
    !!baseCurrencyCode && !!currencyCode && currencyCode !== baseCurrencyCode;

  const { subtotal, discountAmount, netAmount, taxAmount, totalPrice } =
    computePrItemAmounts({
      price,
      qty: calcQty,
      discRate,
      isDiscAdj,
      discAmt,
      taxRate,
      isTaxAdj,
      taxAmt,
    });

  // Sync computed values back to form
  useEffect(() => {
    if (index === -1) return;
    if (!isDiscAdj) {
      form.setValue(`items.${index}.discount_amount`, discountAmount);
    }
    if (!isTaxAdj) {
      form.setValue(`items.${index}.tax_amount`, taxAmount);
    }
    form.setValue(`items.${index}.net_amount`, netAmount);
    form.setValue(`items.${index}.total_price`, totalPrice);
  }, [
    index,
    discountAmount,
    taxAmount,
    netAmount,
    totalPrice,
    isDiscAdj,
    isTaxAdj,
    form,
  ]);

  if (index === -1) return null;

  const pricelistNo = watchPricelistNo ?? null;
  const productId = watchProductId ?? "";
  const productName = watchProductName ?? "";
  const unitId = watchUnitId ?? "";
  const currencyId = watchCurrencyId ?? "";
  const deliveryDate = watchDeliveryDate ?? "";
  const requestedUnitName = watchRequestedUnitName ?? "";
  const approvedUnitName = watchApprovedUnitName ?? "";
  const vendorName = watchVendorName ?? "";
  const taxProfileName = watchTaxProfileName ?? "";

  const handlePricelistSelect = (entry: PricelistEntry) => {
    form.setValue(`items.${index}.vendor_id`, entry.vendor_id);
    form.setValue(`items.${index}.vendor_name`, entry.vendor_name);
    form.setValue(`items.${index}.pricelist_price`, entry.price);
    form.setValue(
      `items.${index}.pricelist_detail_id`,
      entry.pricelist_detail_id,
    );
    form.setValue(`items.${index}.pricelist_no`, entry.pricelist_no);
    form.setValue(
      `items.${index}.pricelist_type`,
      PR_ITEM_PRICELIST_COMPARE_TYPE.MANUAL_SELECT,
    );
  };

  const itemErrors = form.formState.errors.items?.[index];
  const vendorError = itemErrors?.vendor_id?.message;
  const priceError = itemErrors?.pricelist_price?.message;
  const taxProfileError = itemErrors?.tax_profile_id?.message;
  const taxAmountError = itemErrors?.tax_amount?.message;
  const discountAmountError = itemErrors?.discount_amount?.message;

  return (
    <div className="w-full space-y-3 px-3 py-2">
      {/* ── Vendor & Pricing ── */}
      <div className="grid grid-cols-[1fr_8rem_1fr] items-end gap-3">
        <Field>
          <FieldLabel
            htmlFor={`items-${index}-vendor`}
            className="text-muted-foreground text-xs"
          >
            {tfl("vendor")}
          </FieldLabel>
          {isFieldDisabled ? (
            <p className="mt-1 h-7 truncate text-xs leading-7 font-semibold">
              {vendorName || "—"}
            </p>
          ) : (
            <Controller
              control={form.control}
              name={`items.${index}.vendor_id`}
              render={({ field }) => (
                <LookupVendor
                  value={field.value ?? ""}
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value) {
                      form.setValue(`items.${index}.stage_status`, "approve");
                      form.setValue(
                        `items.${index}.current_stage_status`,
                        "approve",
                      );
                    }
                  }}
                  className="mt-1 h-7 w-full text-xs"
                  error={vendorError}
                />
              )}
            />
          )}
        </Field>
        <Field>
          <FieldLabel
            htmlFor={`items-${index}-pricelist-price`}
            className="text-muted-foreground text-xs"
          >
            {tfl("unitPrice")}
          </FieldLabel>
          {isFieldDisabled ? (
            <p
              className={`mt-1 h-7 text-xs leading-7 font-semibold tabular-nums ${price ? "text-right" : "text-left"}`}
            >
              {price ? formatCurrency(price) : "—"}
            </p>
          ) : (
            <InputAmount
              id={`items-${index}-pricelist-price`}
              decimals={watchCurrencyDecimals}
              min={0}
              className={`mt-1 h-7 text-right text-xs ${priceError ? "pl-7" : ""}`}
              error={priceError}
              errorIconAlign="left"
              defaultValue={price}
              {...form.register(`items.${index}.pricelist_price`)}
              onChange={(e) => {
                const n = e.target.valueAsNumber;
                form.setValue(
                  `items.${index}.pricelist_price`,
                  Number.isNaN(n) ? 0 : n,
                  { shouldDirty: true, shouldValidate: true },
                );
                form.setValue(
                  `items.${index}.pricelist_type`,
                  PR_ITEM_PRICELIST_COMPARE_TYPE.MANUAL_INPUT,
                );
              }}
            />
          )}
        </Field>
        <Field>
          <FieldLabel className="text-muted-foreground text-xs">
            {tfl("pricelist")}
          </FieldLabel>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground mt-1 h-7 flex-1 truncate text-xs leading-7">
              {pricelistNo || "—"}
            </span>
            {productId &&
              unitId &&
              currencyId &&
              (role === STAGE_ROLE.PURCHASE || role === STAGE_ROLE.APPROVE) && (
                <Button
                  type="button"
                  size="xs"
                  className="shrink-0"
                  aria-label={tfl("pricelist")}
                  onClick={() => setShowPricelist(true)}
                >
                  <Scale className="size-3" />
                  {tc("compare")}
                </Button>
              )}
          </div>
        </Field>
      </div>

      {/* ── Tax & Discount ── */}
      <div className="border-t pt-1">
        <div className="grid grid-cols-[14rem_5rem_10rem_5rem_10rem] items-end gap-3">
          <Field>
            <FieldLabel
              htmlFor={`items-${index}-tax-profile`}
              className="text-muted-foreground text-xs"
            >
              {tfl("taxProfile")}
            </FieldLabel>
            {isFieldDisabled ? (
              <p className="mt-1 h-6 truncate text-xs leading-6 font-semibold">
                {taxProfileName || "—"}
              </p>
            ) : (
              <Controller
                control={form.control}
                name={`items.${index}.tax_profile_id`}
                render={({ field }) => (
                  <LookupTaxProfile
                    value={field.value ?? ""}
                    onValueChange={(value, taxRate, taxProfileName) => {
                      field.onChange(value || null);
                      form.setValue(`items.${index}.tax_rate`, taxRate);
                      form.setValue(
                        `items.${index}.tax_profile_name`,
                        taxProfileName,
                      );
                    }}
                    className="mt-1 w-full text-xs"
                    size="xs"
                    error={taxProfileError}
                  />
                )}
              />
            )}
          </Field>
          <Field>
            <FieldLabel
              htmlFor={`items-${index}-tax-rate`}
              className="text-muted-foreground text-xs"
            >
              {tfl("taxPercent")}
            </FieldLabel>
            <p className="mt-1 h-6 text-right text-xs leading-6 font-semibold tabular-nums">
              {taxRate}
            </p>
          </Field>
          <Field>
            <div className="mb-1 flex items-center justify-between">
              <FieldLabel
                htmlFor={`items-${index}-tax-amount`}
                className="text-muted-foreground text-xs"
              >
                {tfl("taxAmt")}
              </FieldLabel>
              {!isFieldDisabled && (
                <Controller
                  control={form.control}
                  name={`items.${index}.is_tax_adjustment`}
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-1">
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        className="size-3.5"
                      />
                      <span className="text-muted-foreground text-xs select-none">
                        {tfl("override")}
                      </span>
                    </label>
                  )}
                />
              )}
            </div>
            {isFieldDisabled ? (
              <p className="h-6 text-right text-xs leading-6 font-semibold tabular-nums">
                {formatCurrency(taxAmount)}
              </p>
            ) : (
              <InputAmount
                id={`items-${index}-tax-amount`}
                decimals={watchCurrencyDecimals}
                min={0}
                className={`h-6 text-right text-xs ${taxAmountError ? "pl-7" : ""}`}
                disabled={!isTaxAdj}
                error={taxAmountError}
                errorIconAlign="left"
                defaultValue={taxAmt}
                {...form.register(`items.${index}.tax_amount`)}
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  form.setValue(
                    `items.${index}.tax_amount`,
                    Number.isNaN(n) ? 0 : n,
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              />
            )}
          </Field>
          <Field>
            <FieldLabel
              htmlFor={`items-${index}-discount-rate`}
              className="text-muted-foreground mb-0.5 text-xs"
            >
              {tfl("discPercent")}
            </FieldLabel>
            {isFieldDisabled ? (
              <p className="mt-1 h-6 text-right text-xs leading-6 font-semibold tabular-nums">
                {discRate}
              </p>
            ) : (
              <FieldInput
                id={`items-${index}-discount-rate`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0"
                className="mt-1 h-6 text-right text-xs"
                defaultValue={discRate}
                {...form.register(`items.${index}.discount_rate`)}
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  form.setValue(
                    `items.${index}.discount_rate`,
                    Number.isNaN(n) ? 0 : n,
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              />
            )}
          </Field>
          <Field>
            <div className="mb-1 flex items-center justify-between">
              <FieldLabel
                htmlFor={`items-${index}-discount-amount`}
                className="text-muted-foreground text-xs"
              >
                {tfl("discAmt")}
              </FieldLabel>
              {!isFieldDisabled && (
                <Controller
                  control={form.control}
                  name={`items.${index}.is_discount_adjustment`}
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-1">
                      <Checkbox
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        className="size-3.5"
                      />
                      <span className="text-muted-foreground text-xs select-none">
                        {tfl("override")}
                      </span>
                    </label>
                  )}
                />
              )}
            </div>
            {isFieldDisabled ? (
              <p className="h-6 text-right text-xs leading-6 font-semibold tabular-nums">
                {formatCurrency(discountAmount)}
              </p>
            ) : (
              <InputAmount
                id={`items-${index}-discount-amount`}
                decimals={watchCurrencyDecimals}
                min={0}
                className={`h-6 text-right text-xs ${discountAmountError ? "pl-7" : ""}`}
                disabled={!isDiscAdj}
                error={discountAmountError}
                errorIconAlign="left"
                defaultValue={discAmt}
                {...form.register(`items.${index}.discount_amount`)}
                onChange={(e) => {
                  const n = e.target.valueAsNumber;
                  form.setValue(
                    `items.${index}.discount_amount`,
                    Number.isNaN(n) ? 0 : n,
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              />
            )}
          </Field>
        </div>
      </div>

      <PrItemSummary
        subtotal={subtotal}
        netAmount={netAmount}
        totalPrice={totalPrice}
        exchangeRate={exchangeRate}
        isForeignCurrency={isForeignCurrency}
        baseCurrencyCode={baseCurrencyCode}
        currencyCode={watchCurrencyCode ?? ""}
      />

      <PrInventoryRow
        control={form.control}
        index={index}
        buCode={buCode ?? ""}
      />

      <Suspense fallback={null}>
        <PrPricelistDialog
          open={showPricelist}
          onOpenChange={setShowPricelist}
          productId={productId}
          productName={productName}
          unitId={unitId}
          currencyId={currencyId}
          atDate={formatDate(deliveryDate, "yyyy-MM-dd")}
          requestedQty={qty}
          requestedUnitName={requestedUnitName}
          approvedQty={approvedQty}
          approvedUnitName={approvedUnitName}
          onSelect={handlePricelistSelect}
          readOnly={role !== STAGE_ROLE.PURCHASE}
        />
      </Suspense>
    </div>
  );
}
