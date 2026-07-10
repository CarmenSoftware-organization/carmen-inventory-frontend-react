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
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { formatCurrency } from "@/lib/currency-utils";
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
    // override ปิด: amount auto จาก rate · override เปิด: amount กรอกเอง,
    // rate ค้างค่าเดิม (disabled, ไม่ back-compute) — ทั้ง discount และ tax
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
      {/* Vendor · Unit Price · Pricelist · Discount · Tax — แถวเดียว
          Inventory · Summary อยู่แถบล่าง */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-[15rem_6rem_8rem_11rem_0.9fr_12rem_0.9fr_15rem]">
          {/* Vendor */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel
              htmlFor={`items-${index}-vendor`}
              className="text-muted-foreground flex min-h-6 items-center text-xs tracking-wide"
            >
              {tfl("vendor")}
            </FieldLabel>
            {isFieldDisabled ? (
              <p
                className={`flex items-center truncate text-xs font-medium ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
              >
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
                        form.setValue(`items.${index}.stage_status`, "approve");
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
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel
              htmlFor={`items-${index}-pricelist-price`}
              className="text-muted-foreground flex min-h-6 items-center text-xs tracking-wide"
            >
              {tfl("unitPrice")}
            </FieldLabel>
            {isFieldDisabled ? (
              <p className="flex min-h-6 items-center text-xs font-semibold tabular-nums">
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

          {/* Exchange rate — แก้ไขได้ (มีผลจริงเมื่อเป็นสกุลต่างประเทศ) */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel
              htmlFor={`items-${index}-exchange-rate`}
              className="text-muted-foreground flex min-h-6 items-center text-xs tracking-wide"
            >
              {tfl("exchangeRate")}
            </FieldLabel>
            {isFieldDisabled ? (
              <p
                className={`flex items-center text-xs font-medium tabular-nums ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
              >
                {exchangeRate}
              </p>
            ) : (
              <InputSuffixField className="h-8 w-full">
                <InputSuffixInput
                  id={`items-${index}-exchange-rate`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.0001"
                  className="h-8 text-right text-xs"
                  defaultValue={exchangeRate}
                  {...form.register(`items.${index}.exchange_rate`)}
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    form.setValue(
                      `items.${index}.exchange_rate`,
                      Number.isNaN(n) ? 1 : n,
                      { shouldDirty: true },
                    );
                  }}
                />
                <span className="bg-muted text-muted-foreground border-border flex shrink-0 items-center self-stretch border-l px-2 text-[0.625rem] whitespace-nowrap">
                  {baseCurrencyCode}
                </span>
              </InputSuffixField>
            )}
          </Field>

          {/* Pricelist */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <div className="flex min-h-6 items-center justify-between gap-2">
              <FieldLabel className="text-muted-foreground text-xs tracking-wide">
                {tfl("pricelist")}
              </FieldLabel>
              {productId &&
                unitId &&
                currencyId &&
                (role === STAGE_ROLE.PURCHASE ||
                  role === STAGE_ROLE.APPROVE) && (
                  <button
                    type="button"
                    onClick={() => setShowPricelist(true)}
                    className="text-primary flex items-center gap-1 text-[0.625rem] font-semibold tracking-wide uppercase underline-offset-4 hover:cursor-pointer hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    <Scale className="size-3" />
                    {tc("compare")}
                  </button>
                )}
            </div>
            <p
              className={`flex items-center truncate text-xs font-medium ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
            >
              {pricelistNo || "—"}
            </p>
          </Field>

          {/* Subtotal — plaintext (คำนวณ ไม่แก้ไข) */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel className="text-muted-foreground flex min-h-6 items-center text-xs tracking-wide">
              {tfl("subtotal")}
            </FieldLabel>
            <p
              className={`flex items-center text-xs font-medium tabular-nums ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
            >
              {formatCurrency(subtotal)}
            </p>
          </Field>

          {/* Discount */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <div className="flex min-h-6 items-center justify-between gap-2">
              <FieldLabel className="text-muted-foreground text-xs tracking-wide">
                {tfl("discount")}
              </FieldLabel>
              {!isFieldDisabled &&
                overrideToggle(`items.${index}.is_discount_adjustment`)}
            </div>
            {isFieldDisabled ? (
              <p className="flex min-h-6 items-center gap-1.5 truncate text-xs font-medium">
                <span className="text-muted-foreground tabular-nums">
                  {discRate}%
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="tabular-nums">
                  {formatCurrency(discountAmount)}
                </span>
                <span className="text-muted-foreground">{currencyCode}</span>
              </p>
            ) : (
              <InputSuffixField
                className="w-full"
                error={!!discountAmountError}
              >
                <InputSuffixInput
                  id={`items-${index}-discount-rate`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  aria-label={tfl("discPercent")}
                  max={100}
                  disabled={isDiscAdj}
                  className="disabled:bg-muted disabled:text-muted-foreground h-8 w-12 flex-none rounded-none border-0 bg-transparent px-1 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
                  defaultValue={discRate}
                  {...form.register(`items.${index}.discount_rate`)}
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    // clamp 0–100 (disc% สูงสุด 100)
                    const rate = Number.isNaN(n)
                      ? 0
                      : Math.min(100, Math.max(0, n));
                    form.setValue(`items.${index}.discount_rate`, rate, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                />
                <span className="bg-muted text-muted-foreground border-border flex shrink-0 items-center self-stretch border-l px-2 text-[0.625rem]">
                  %
                </span>
                <div
                  className="bg-border h-4 w-px shrink-0"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <InputAmount
                    id={`items-${index}-discount-amount`}
                    decimals={watchCurrencyDecimals}
                    min={0}
                    disabled={!isDiscAdj}
                    aria-label={tfl("discAmt")}
                    className="disabled:bg-muted disabled:text-muted-foreground h-8 w-full rounded-none border-0 bg-transparent pr-1 pl-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
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
                </div>
                <span className="bg-muted text-muted-foreground border-border flex shrink-0 items-center self-stretch border-l px-2 text-[0.625rem] whitespace-nowrap">
                  {currencyCode}
                </span>
              </InputSuffixField>
            )}
          </Field>

          {/* Net — plaintext */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel className="text-muted-foreground flex min-h-6 items-center text-xs tracking-wide">
              {tfl("net")}
            </FieldLabel>
            <p
              className={`flex items-center text-xs font-medium tabular-nums ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
            >
              {formatCurrency(netAmount)}
            </p>
          </Field>

          {/* Tax */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <div className="flex min-h-6 items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <FieldLabel className="text-muted-foreground text-xs tracking-wide">
                  {tfl("tax")}
                </FieldLabel>
                {/* tax rate เป็น plain text (มาจาก profile — override ไม่ได้) */}
                {taxRate > 0 && (
                  <span className="text-muted-foreground text-[0.625rem] font-semibold tabular-nums">
                    {taxRate}%
                  </span>
                )}
              </div>
              {!isFieldDisabled &&
                overrideToggle(`items.${index}.is_tax_adjustment`)}
            </div>
            {isFieldDisabled ? (
              <p className="flex min-h-6 items-center gap-1.5 truncate text-xs font-medium">
                {taxProfileName ? (
                  <>
                    <span className="truncate">{taxProfileName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="tabular-nums">
                      {formatCurrency(taxAmount)}
                    </span>
                    <span className="text-muted-foreground">
                      {currencyCode}
                    </span>
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
                  // tax profile · tax amount (+ rate% เป็น suffix) ในกล่องเดียว
                  <InputSuffixField
                    className="w-full"
                    error={!!taxProfileError || !!taxAmountError}
                  >
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
                    <div
                      className="bg-border h-4 w-px shrink-0"
                      aria-hidden="true"
                    />
                    <InputAmount
                      id={`items-${index}-tax-amount`}
                      decimals={watchCurrencyDecimals}
                      min={0}
                      disabled={!isTaxAdj}
                      aria-label={tfl("taxAmt")}
                      className="disabled:bg-muted disabled:text-muted-foreground h-8 w-24 shrink-0 rounded-none border-0 bg-transparent pr-1 pl-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
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
                    <span className="bg-muted text-muted-foreground border-border flex shrink-0 items-center self-stretch border-l px-2 text-[0.625rem] whitespace-nowrap">
                      {currencyCode}
                    </span>
                  </InputSuffixField>
                )}
              />
            )}
          </Field>
        </div>

        {/* Inventory · Summary — แถบล่าง */}
        <div className="flex flex-col gap-4 border-t pt-4 lg:flex-row lg:items-start lg:justify-between">
          <PrInventoryRow
            control={form.control}
            index={index}
            buCode={buCode ?? ""}
          />
          <div className="flex shrink-0 flex-col items-end gap-3">
            <PrItemSummary
              subtotal={subtotal}
              discountAmount={discountAmount}
              netAmount={netAmount}
              taxAmount={taxAmount}
              totalPrice={totalPrice}
              exchangeRate={exchangeRate}
              isForeignCurrency={isForeignCurrency}
              baseCurrencyCode={baseCurrencyCode}
              currencyCode={watchCurrencyCode ?? ""}
            />
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
          // เลือกราคาได้เฉพาะ edit mode + role purchase — view/role อื่นดูได้อย่างเดียว
          readOnly={isFieldDisabled || role !== STAGE_ROLE.PURCHASE}
        />
      </Suspense>
    </div>
  );
}
