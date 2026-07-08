import { useEffect } from "react";
import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldDatePicker,
  FieldInput,
  FieldLabel,
  FieldPlainText,
  FieldSelect,
} from "@/components/ui/field";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
  InputSuffixPlain,
} from "@/components/ui/input/input-suffix";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { LookupGrnByVendorForCn } from "@/components/lookup/lookup-grn-by-vendor-for-cn";
import { LookupCnReason } from "@/components/lookup/lookup-cn-reason";
import { formatExchangeRate } from "@/lib/currency-utils";
import { useProfile } from "@/hooks/use-profile";
import { useCurrency } from "@/hooks/use-currency";
import type { CnFormValues } from "./cn-form-schema";

interface CnGeneralFieldsProps {
  readonly form: UseFormReturn<CnFormValues>;
  readonly disabled: boolean;
  /** view mode → แสดงทุก field เป็น plain text แทน input */
  readonly plainText?: boolean;
}

export function CnGeneralFields({
  form,
  disabled,
  plainText = false,
}: CnGeneralFieldsProps) {
  const t = useTranslations("procurement.creditNote");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");

  const { defaultCurrencyId } = useProfile();
  const { data: currencyData } = useCurrency({ perpage: -1 });

  const errors = form.formState.errors;
  const vendorId = useWatch({ control: form.control, name: "vendor_id" });
  const exchangeRate = useWatch({
    control: form.control,
    name: "exchange_rate",
  });
  const currencyCode = useWatch({
    control: form.control,
    name: "currency_code",
  });
  // currency_code เก็บ id → resolve เป็นตัวอักษรสกุลเงิน (THB) สำหรับต่อท้าย rate
  const currencyLabel =
    currencyData?.data?.find((c) => c.id === currencyCode)?.code ?? "";
  // GRN Reference เป็น plain text เสมอ → ต้อง watch ให้ reactive ตอนเลือก GRN
  const invoiceNo = useWatch({ control: form.control, name: "invoice_no" });

  // Seed default currency จาก profile เมื่อยังว่าง (เหมือน PO/GRN) —
  // การเลือก GRN จะ override ค่าทีหลังถ้าต่างกัน
  useEffect(() => {
    const currencies = currencyData?.data?.filter((c) => c.is_active) ?? [];
    if (!currencyCode && defaultCurrencyId && currencies.length > 0) {
      const currency = currencies.find((c) => c.id === defaultCurrencyId);
      if (currency) {
        form.setValue("currency_code", defaultCurrencyId);
        form.setValue("exchange_rate", currency.exchange_rate);
      }
    }
  }, [currencyCode, defaultCurrencyId, currencyData?.data, form]);

  const cnTypeLabels: Record<string, string> = {
    quantity_return: t("quantityReturn"),
    amount_discount: t("amountDiscount"),
  };

  // view mode → คู่ label↔value ชิด (gap-1) + label เงียบ (เทา/ปกติ) ให้ value
  // เด่นกว่า สร้าง proximity grouping + lightness contrast แบบ Apple (เหมือน PO)
  const viewFieldGap = plainText ? "gap-1" : undefined;
  const viewLabelClass = plainText
    ? "text-muted-foreground font-normal text-xs"
    : undefined;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass} required>
          {t("cnType")}
        </FieldLabel>
        <Controller
          control={form.control}
          name="credit_note_type"
          render={({ field }) =>
            plainText ? (
              <FieldPlainText>{cnTypeLabels[field.value]}</FieldPlainText>
            ) : (
              <FieldSelect
                value={field.value}
                onValueChange={field.onChange}
                placeholder={tfl("selectType")}
                className="w-full text-xs"
                disabled={disabled}
                error={errors.credit_note_type?.message}
                size="sm"
              >
                <SelectContent>
                  <SelectItem value="quantity_return" className="text-xs">
                    {t("quantityReturn")}
                  </SelectItem>
                  <SelectItem value="amount_discount" className="text-xs">
                    {t("amountDiscount")}
                  </SelectItem>
                </SelectContent>
              </FieldSelect>
            )
          }
        />
      </Field>

      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass} required>
          {tfl("vendor")}
        </FieldLabel>
        <Controller
          control={form.control}
          name="vendor_id"
          render={({ field }) => (
            <LookupVendor
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              readOnly={plainText}
              error={errors.vendor_id?.message}
              className="text-xs"
            />
          )}
        />
      </Field>

      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass} required>
          {tfl("grnNo")}
        </FieldLabel>
        <Controller
          control={form.control}
          name="grn_id"
          render={({ field }) => (
            <LookupGrnByVendorForCn
              value={field.value}
              onValueChange={field.onChange}
              onItemChange={(grn) => {
                form.setValue("grn_date", grn.grn_date ?? "");
                form.setValue("currency_code", grn.currency_id ?? "");
                form.setValue("exchange_rate", grn.exchange_rate ?? 1);
                form.setValue("invoice_no", grn.invoice_no ?? "");
                form.setValue("invoice_date", grn.invoice_date ?? "");
              }}
              vendorId={vendorId}
              disabled={disabled}
              readOnly={plainText}
              error={errors.grn_id?.message}
              className="text-xs"
            />
          )}
        />
      </Field>

      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass} required>
          {tfl("reason")}
        </FieldLabel>
        <Controller
          control={form.control}
          name="reason"
          render={({ field }) => (
            <LookupCnReason
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              readOnly={plainText}
              error={errors.reason?.message}
              className="w-full text-xs"
            />
          )}
        />
      </Field>
      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass}>{tfl("grnDate")}</FieldLabel>
        <Controller
          control={form.control}
          name="grn_date"
          render={({ field }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              placeholder={tc("selectDate")}
              className="text-xs"
              readOnly
              error={errors.grn_date?.message}
            />
          )}
        />
      </Field>

      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass}>{tfl("invoiceNo")}</FieldLabel>
        <FieldPlainText>{invoiceNo}</FieldPlainText>
      </Field>

      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass}>{tfl("invoiceDate")}</FieldLabel>
        <Controller
          control={form.control}
          name="invoice_date"
          render={({ field }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              placeholder={tc("selectDate")}
              className="text-xs"
              readOnly
              error={errors.invoice_date?.message}
            />
          )}
        />
      </Field>
      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass} htmlFor="cn-exchange-rate">
          {tfl("currency")}
        </FieldLabel>
        {plainText ? (
          <InputSuffixPlain
            className="inline-flex min-h-8 items-center text-left text-xs"
            value={formatExchangeRate(exchangeRate)}
            suffix={currencyLabel}
          />
        ) : (
          <InputSuffixField error={!!errors.currency_code?.message}>
            <InputSuffixInput
              id="cn-exchange-rate"
              type="number"
              inputMode="decimal"
              step="0.0001"
              disabled
              {...form.register("exchange_rate")}
            />
            <InputSuffixAddon>
              <Controller
                control={form.control}
                name="currency_code"
                render={({ field }) => (
                  <LookupCurrency
                    value={field.value}
                    onValueChange={field.onChange}
                    onItemChange={(currency) => {
                      form.setValue("exchange_rate", currency.exchange_rate);
                    }}
                    disabled={disabled}
                    className="h-full w-24 rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
                  />
                )}
              />
            </InputSuffixAddon>
          </InputSuffixField>
        )}
      </Field>

      <Field className={viewFieldGap}>
        <FieldLabel
          className={viewLabelClass}
          htmlFor="cn-tax-invoice-no"
          required
        >
          {tfl("taxInvoiceNo")}
        </FieldLabel>
        {plainText ? (
          <FieldPlainText>{form.getValues("tax_invoice_no")}</FieldPlainText>
        ) : (
          <FieldInput
            id="cn-tax-invoice-no"
            placeholder="e.g. TAX-001"
            className="h-8"
            disabled={disabled}
            maxLength={100}
            error={errors.tax_invoice_no?.message}
            {...form.register("tax_invoice_no")}
          />
        )}
      </Field>

      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass} required>
          {tfl("taxInvoiceDate")}
        </FieldLabel>
        <Controller
          control={form.control}
          name="tax_invoice_date"
          render={({ field }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled}
              placeholder={tc("selectDate")}
              className="w-full text-xs"
              readOnly={plainText}
              error={errors.tax_invoice_date?.message}
            />
          )}
        />
      </Field>
    </div>
  );
}
