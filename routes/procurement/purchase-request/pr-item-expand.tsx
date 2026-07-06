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
import { Field, FieldLabel } from "@/components/ui/field";
import { InputAmount } from "@/components/ui/input/input-amount";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { EyeBrow } from "@/components/ui/eye-brow";
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
  import("./pr-pricelist-dialog").then((mod) => ({
    default: mod.PrPricelistDialog,
  })),
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

  const overrideToggle = (
    name:
      | `items.${number}.is_tax_adjustment`
      | `items.${number}.is_discount_adjustment`,
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <label className="flex cursor-pointer items-center gap-1.5">
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
  );

  return (
    <div className="w-full p-3">
      {/* 2-column via float + BFC (NOT flex/grid): the DataGrid expands into a
          table-fixed <td colSpan>, which gives flex/grid no definite width to
          split — but floats + flow-root lay out correctly inside a table-cell.
          Right = Inventory + Summary; left = the editable detail groups. */}
      {/* full width — left 80% details · right 20% Inventory + Summary */}
      <div className="w-full">
        <aside className="sm:float-right sm:mb-0 sm:ml-6 sm:w-[30%]">
          <PrInventoryRow
            control={form.control}
            index={index}
            buCode={buCode ?? ""}
          />
          <PrItemSummary
            subtotal={subtotal}
            netAmount={netAmount}
            totalPrice={totalPrice}
            exchangeRate={exchangeRate}
            isForeignCurrency={isForeignCurrency}
            baseCurrencyCode={baseCurrencyCode}
            currencyCode={watchCurrencyCode ?? ""}
          />
        </aside>

        <div className="space-y-3 sm:flow-root">
          {/* ── Pricing: vendor · unit price · pricelist ── */}
          <section className="space-y-2">
            <EyeBrow>{tfl("pricing")}</EyeBrow>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.5fr_8rem_1.2fr]">
              {/* Vendor */}
              <Field>
                <FieldLabel
                  htmlFor={`items-${index}-vendor`}
                  className="text-muted-foreground flex min-h-6 items-center text-xs"
                >
                  {tfl("vendor")}
                </FieldLabel>
                {isFieldDisabled ? (
                  <p className="flex min-h-8 items-center truncate text-xs font-medium">
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
                          // shouldValidate: ล้างกรอบแดง vendor ทันทีที่เลือก
                          // (mode=onSubmit จึงต้อง validate เองไม่งั้น error ค้าง)
                          form.setValue(`items.${index}.vendor_id`, value, {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          if (value) {
                            form.setValue(
                              `items.${index}.stage_status`,
                              "approve",
                            );
                            form.setValue(
                              `items.${index}.current_stage_status`,
                              "approve",
                            );
                          }
                        }}
                        className="w-full text-xs"
                        error={vendorError}
                      />
                    )}
                  />
                )}
              </Field>

              {/* Unit price */}
              <Field>
                <FieldLabel
                  htmlFor={`items-${index}-pricelist-price`}
                  className="text-muted-foreground flex min-h-6 items-center text-xs"
                >
                  {tfl("unitPrice")}
                </FieldLabel>
                {isFieldDisabled ? (
                  <p className="flex min-h-8 items-center text-xs font-semibold tabular-nums">
                    {price ? formatCurrency(price) : "—"}
                  </p>
                ) : (
                  <InputAmount
                    id={`items-${index}-pricelist-price`}
                    decimals={watchCurrencyDecimals}
                    min={0}
                    className={`h-8 text-right text-xs ${priceError ? "pl-7" : ""}`}
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

              {/* Pricelist */}
              <Field>
                <div className="flex min-h-6 items-center justify-between">
                  <FieldLabel className="text-muted-foreground text-xs">
                    {tfl("pricelist")}
                  </FieldLabel>
                  {productId &&
                    unitId &&
                    currencyId &&
                    (role === STAGE_ROLE.PURCHASE ||
                      role === STAGE_ROLE.APPROVE) && (
                      <Button
                        type="button"
                        size="xs"
                        variant="ghost"
                        className="text-primary shrink-0 px-2"
                        aria-label={tfl("pricelist")}
                        onClick={() => setShowPricelist(true)}
                      >
                        <Scale className="size-3" />
                        {tc("compare")}
                      </Button>
                    )}
                </div>
                <span className="flex min-h-8 items-center truncate text-xs font-medium">
                  {pricelistNo || "—"}
                </span>
              </Field>
            </div>
          </section>

          {/* ── Tax & Discount — two calm groups instead of a 5-col micro-grid ── */}
          <div className="grid grid-cols-1 gap-2 gap-x-8 border-t pt-5 sm:grid-cols-2">
            {/* Tax */}
            <section className="space-y-2">
              <EyeBrow>{tfl("tax")}</EyeBrow>
              {/* Tax Profile (+ rate prefix) · Tax Amt ในแถวเดียวกัน */}
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-2">
                <Field>
                  <FieldLabel
                    htmlFor={`items-${index}-tax-profile`}
                    className="text-muted-foreground flex min-h-6 items-center text-xs"
                  >
                    {tfl("taxProfile")}
                  </FieldLabel>
                  {isFieldDisabled ? (
                    <p className="flex min-h-8 items-center gap-1.5 truncate text-xs font-medium">
                      {taxProfileName ? (
                        <>
                          <span className="text-muted-foreground tabular-nums">
                            {taxRate}%
                          </span>
                          <span className="truncate">{taxProfileName}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </p>
                  ) : (
                    <Controller
                      control={form.control}
                      name={`items.${index}.tax_profile_id`}
                      render={({ field }) => (
                        // % (rate) เป็น prefix ซ้าย + tax profile select ในกล่องเดียว
                        <InputSuffixField
                          className="w-full"
                          error={!!taxProfileError}
                        >
                          <span className="text-muted-foreground shrink-0 px-2 text-xs whitespace-nowrap tabular-nums">
                            {taxRate}%
                          </span>
                          <div
                            className="bg-border h-4 w-px shrink-0"
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <LookupTaxProfile
                              value={field.value ?? ""}
                              onValueChange={(value, rate, name) => {
                                // shouldValidate: ล้างกรอบแดง tax ทันทีที่เลือก
                                form.setValue(
                                  `items.${index}.tax_profile_id`,
                                  value || null,
                                  { shouldDirty: true, shouldValidate: true },
                                );
                                form.setValue(`items.${index}.tax_rate`, rate);
                                form.setValue(
                                  `items.${index}.tax_profile_name`,
                                  name,
                                );
                              }}
                              className="w-full rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
                            />
                          </div>
                        </InputSuffixField>
                      )}
                    />
                  )}
                </Field>
                <Field>
                  <div className="flex min-h-6 items-center justify-between gap-2">
                    <FieldLabel
                      htmlFor={`items-${index}-tax-amount`}
                      className="text-muted-foreground text-xs"
                    >
                      {tfl("taxAmt")}
                    </FieldLabel>
                    {!isFieldDisabled &&
                      overrideToggle(`items.${index}.is_tax_adjustment`)}
                  </div>
                  {isFieldDisabled ? (
                    <p className="flex min-h-8 items-center text-xs font-semibold tabular-nums">
                      {formatCurrency(taxAmount)}
                    </p>
                  ) : (
                    <InputAmount
                      id={`items-${index}-tax-amount`}
                      decimals={watchCurrencyDecimals}
                      min={0}
                      className={`h-8 text-right text-xs ${taxAmountError ? "pl-7" : ""}`}
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
              </div>
            </section>

            {/* Discount */}
            <section className="space-y-2">
              <EyeBrow>{tfl("discount")}</EyeBrow>
              <div className="grid grid-cols-[5rem_1fr] gap-x-2">
                <Field>
                  <FieldLabel
                    htmlFor={`items-${index}-discount-rate`}
                    className="text-muted-foreground flex min-h-6 items-center text-xs"
                  >
                    {tfl("discPercent")}
                  </FieldLabel>
                  {isFieldDisabled ? (
                    <p className="flex min-h-8 items-center text-xs font-semibold tabular-nums">
                      {discRate}
                    </p>
                  ) : (
                    <InputSuffixField className="h-8">
                      <InputSuffixInput
                        id={`items-${index}-discount-rate`}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        placeholder="0"
                        className="h-8 text-right text-xs"
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
                      <InputSuffixAddon>
                        <span className="text-muted-foreground px-2 text-xs">
                          %
                        </span>
                      </InputSuffixAddon>
                    </InputSuffixField>
                  )}
                </Field>
                <Field>
                  <div className="flex min-h-6 items-center justify-between gap-2">
                    <FieldLabel
                      htmlFor={`items-${index}-discount-amount`}
                      className="text-muted-foreground text-xs"
                    >
                      {tfl("discAmt")}
                    </FieldLabel>
                    {!isFieldDisabled &&
                      overrideToggle(`items.${index}.is_discount_adjustment`)}
                  </div>
                  {isFieldDisabled ? (
                    <p className="flex min-h-8 items-center text-xs font-semibold tabular-nums">
                      {formatCurrency(discountAmount)}
                    </p>
                  ) : (
                    <InputAmount
                      id={`items-${index}-discount-amount`}
                      decimals={watchCurrencyDecimals}
                      min={0}
                      className={`h-8 text-right text-xs ${taxAmountError ? "pl-7" : ""}`}
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
            </section>
          </div>
        </div>
      </div>

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
