import { useEffect } from "react";
import {
  Controller,
  useWatch,
  type UseFormReturn,
  type FieldArrayWithId,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { PR_ITEM_PRICELIST_COMPARE_TYPE } from "@/types/purchase-request";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputAmount } from "@/components/ui/input/input-amount";
import {
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { formatCurrency, EXCHANGE_RATE_DECIMALS } from "@/lib/currency-utils";
import { Checkbox } from "@/components/ui/checkbox";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { LookupTaxProfile } from "@/components/lookup/lookup-tax-profile";
import { computePrItemAmounts, type PrFormValues } from "./pr-form-schema";
import PrInventoryRow from "./pr-inventory-row";
import { PrItemSummary } from "./pr-item-summary";

type ItemField = FieldArrayWithId<PrFormValues, "items", "id">;

interface PrItemExpandProps {
  readonly item: ItemField;
  readonly form: UseFormReturn<PrFormValues>;
  readonly isDisabled: boolean;
  readonly itemFields: ItemField[];
  readonly buCode?: string;
  readonly baseCurrencyCode?: string;
}

export function PrItemExpand({
  item,
  form,
  isDisabled,
  itemFields,
  buCode,
  baseCurrencyCode,
}: PrItemExpandProps) {
  const tfl = useTranslations("field");
  const index = itemFields.findIndex((f) => f.id === item.id);

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
    watchApprovedQty,
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
      `items.${i}.approved_qty`,
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
  const vendorName = watchVendorName ?? "";
  const taxProfileName = watchTaxProfileName ?? "";

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
        <div className="grid grid-cols-1 gap-x-2 gap-y-3 sm:grid-cols-2 lg:grid-cols-[5rem_19.5rem_3rem_minmax(4.5rem,1fr)_minmax(4rem,1fr)_minmax(4rem,0.7fr)_minmax(9rem,1.4fr)_minmax(4rem,0.7fr)_minmax(11rem,2fr)_minmax(5rem,1fr)]">
          {/* Pricelist */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel className="text-muted-foreground flex min-h-6 items-center text-xs tracking-wide">
              {tfl("pricelist")}
            </FieldLabel>
            <p
              className={`flex items-center truncate text-xs font-medium ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
            >
              {pricelistNo || "—"}
            </p>
          </Field>

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

          {/* Currency — สกุลเงินของรายการ (เริ่ม col 3 = ตรง Req column) */}
          <Field className={`lg:col-start-3 ${isFieldDisabled ? "gap-1" : ""}`}>
            <FieldLabel className="text-muted-foreground flex min-h-6 items-center justify-end text-xs tracking-wide">
              Cur.
            </FieldLabel>
            <p
              className={`flex items-center justify-end text-xs font-medium ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
            >
              {currencyCode || "—"}
            </p>
          </Field>

          {/* Unit price */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel
              htmlFor={`items-${index}-pricelist-price`}
              className="text-muted-foreground flex min-h-6 items-center justify-end text-xs tracking-wide"
            >
              U.Price
            </FieldLabel>
            {isFieldDisabled ? (
              <p className="flex min-h-6 items-center justify-end text-xs font-semibold tabular-nums">
                {formatCurrency(price)}
              </p>
            ) : (
              <InputAmount
                id={`items-${index}-pricelist-price`}
                decimals={watchCurrencyDecimals}
                className={`h-8 text-right text-xs ${priceError ? "pl-7" : ""}`}
                error={priceError}
                errorIconAlign="left"
                value={price}
                onValueChange={(n) => {
                  form.setValue(`items.${index}.pricelist_price`, n, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
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
              className="text-muted-foreground flex min-h-6 items-center justify-end text-xs tracking-wide"
            >
              Ex. Rate
            </FieldLabel>
            {isFieldDisabled ? (
              <p
                className={`flex items-center justify-end text-xs font-medium tabular-nums ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
              >
                {exchangeRate.toFixed(EXCHANGE_RATE_DECIMALS)}
              </p>
            ) : (
              // exchange rate: fix 5 ทศนิยมตายตัว (เช่น 32.09500) ต่างจาก amount ที่
              // อิงทศนิยมของสกุลเงิน — base/default currency → disabled (rate = 1)
              <InputAmount
                id={`items-${index}-exchange-rate`}
                decimals={EXCHANGE_RATE_DECIMALS}
                disabled={!isForeignCurrency}
                className="disabled:bg-muted disabled:text-muted-foreground h-8 text-right text-xs disabled:cursor-default disabled:opacity-100"
                value={exchangeRate}
                onValueChange={(n) =>
                  form.setValue(`items.${index}.exchange_rate`, n || 1, {
                    shouldDirty: true,
                  })
                }
              />
            )}
          </Field>

          {/* Subtotal — plaintext (คำนวณ ไม่แก้ไข) */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel className="text-muted-foreground flex min-h-6 items-center justify-end text-xs tracking-wide">
              Sub.
            </FieldLabel>
            <p
              className={`flex items-center justify-end text-xs font-medium tabular-nums ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
            >
              {formatCurrency(subtotal)}
            </p>
          </Field>

          {/* Discount */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <div
              className={`flex min-h-6 items-center gap-2 ${isFieldDisabled ? "justify-end" : "justify-between"}`}
            >
              <FieldLabel className="text-muted-foreground text-xs tracking-wide">
                {tfl("discount")}
              </FieldLabel>
              {!isFieldDisabled &&
                overrideToggle(`items.${index}.is_discount_adjustment`)}
            </div>
            {isFieldDisabled ? (
              <p className="flex min-h-6 items-center justify-end gap-1.5 truncate text-xs font-medium">
                <span className="text-muted-foreground tabular-nums">
                  {discRate}%
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="tabular-nums">
                  {formatCurrency(discountAmount)}
                </span>
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
                    disabled={!isDiscAdj}
                    aria-label={tfl("discAmt")}
                    className="disabled:bg-muted disabled:text-muted-foreground h-8 w-full rounded-none border-0 bg-transparent pr-1 pl-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
                    value={discAmt}
                    onValueChange={(n) =>
                      form.setValue(`items.${index}.discount_amount`, n, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                </div>
              </InputSuffixField>
            )}
          </Field>

          {/* Net — plaintext */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel className="text-muted-foreground flex min-h-6 items-center justify-end text-xs tracking-wide">
              {tfl("net")}
            </FieldLabel>
            <p
              className={`flex items-center justify-end text-xs font-medium tabular-nums ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
            >
              {formatCurrency(netAmount)}
            </p>
          </Field>

          {/* Tax */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <div
              className={`flex min-h-6 items-center gap-2 ${isFieldDisabled ? "justify-end" : "justify-between"}`}
            >
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
              <p className="flex min-h-6 items-center justify-end gap-1.5 truncate text-xs font-medium">
                {taxProfileName ? (
                  <>
                    <span className="truncate">{taxProfileName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="tabular-nums">
                      {formatCurrency(taxAmount)}
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
                      disabled={!isTaxAdj}
                      aria-label={tfl("taxAmt")}
                      className="disabled:bg-muted disabled:text-muted-foreground h-8 w-20 shrink-0 rounded-none border-0 bg-transparent pr-1 pl-2 text-right text-xs shadow-none focus-visible:ring-0 disabled:cursor-default disabled:opacity-100"
                      value={taxAmt}
                      onValueChange={(n) =>
                        form.setValue(`items.${index}.tax_amount`, n, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    />
                  </InputSuffixField>
                )}
              />
            )}
          </Field>

          {/* Total — plaintext (สกุลที่เลือก) */}
          <Field className={isFieldDisabled ? "gap-1" : undefined}>
            <FieldLabel className="text-muted-foreground flex min-h-6 items-center justify-end text-xs tracking-wide">
              {tfl("total")}
            </FieldLabel>
            <p
              className={`flex items-center justify-end text-xs font-semibold tabular-nums ${isFieldDisabled ? "min-h-6" : "min-h-8"}`}
            >
              {formatCurrency(totalPrice)}
            </p>
          </Field>

          {/* Inventory — อยู่แถวเดียวกับ base summary (currency diff): inventory
              ซ้าย (col 1-2), base amounts ขวา (col 6-10) */}
          <div className="lg:col-span-2 lg:col-start-1">
            <PrInventoryRow
              control={form.control}
              index={index}
              buCode={buCode ?? ""}
            />
          </div>

          {/* แถว base currency (summary) — เรียงใต้ Subtotal·Discount·Net·Tax·
              Total ของ grid นี้ (เฉพาะสกุลต่างประเทศ) */}
          <PrItemSummary
            subtotal={subtotal}
            discountAmount={discountAmount}
            netAmount={netAmount}
            taxAmount={taxAmount}
            totalPrice={totalPrice}
            exchangeRate={exchangeRate}
            isForeignCurrency={isForeignCurrency}
            baseCurrencyCode={baseCurrencyCode}
          />
        </div>
      </div>
    </div>
  );
}
