import { useEffect, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldDatePicker,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
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

/** ค่าเป็น plain text (view mode) — value เด่น (เข้ม/medium/sm) ให้เกิด
 *  lightness+size contrast เหนือ label ที่เงียบ (เหมือน PO/GRN PlainField) */
function PlainText({ children }: { readonly children: ReactNode }) {
  return (
    <span className="text-foreground inline-flex min-h-8 items-center text-sm font-medium">
      {children || "—"}
    </span>
  );
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
    ? "text-muted-foreground font-normal"
    : undefined;

  return (
    <div className="space-y-4">
      {/* ── 1. Credit Note (กรอกเอง) ── */}
      <section className="space-y-2">
        <GroupLabel>{t("groupDetails")}</GroupLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field className={viewFieldGap}>
            <FieldLabel className={viewLabelClass} required>
              {t("cnType")}
            </FieldLabel>
            <Controller
              control={form.control}
              name="credit_note_type"
              render={({ field }) =>
                plainText ? (
                  <PlainText>{cnTypeLabels[field.value]}</PlainText>
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
                      <SelectItem value="quantity_return">
                        {t("quantityReturn")}
                      </SelectItem>
                      <SelectItem value="amount_discount">
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
        </div>
      </section>

      {/* ── 2. GRN Reference (auto-filled, read-only) ── */}
      <section className="space-y-2">
        <GroupLabel hint={t("grnRefHint")}>{t("groupGrnRef")}</GroupLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            <PlainText>{invoiceNo}</PlainText>
          </Field>

          <Field className={viewFieldGap}>
            <FieldLabel className={viewLabelClass}>
              {tfl("invoiceDate")}
            </FieldLabel>
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
            <FieldLabel className={viewLabelClass}>{tfl("currency")}</FieldLabel>
            <Controller
              control={form.control}
              name="currency_code"
              render={({ field }) => (
                <LookupCurrency
                  value={field.value}
                  onValueChange={field.onChange}
                  readOnly
                  error={errors.currency_code?.message}
                  size="sm"
                  className="text-xs"
                />
              )}
            />
          </Field>

          <Field className={viewFieldGap}>
            <FieldLabel className={viewLabelClass}>
              {tfl("exchangeRate")}
            </FieldLabel>
            <PlainText>{formatExchangeRate(exchangeRate)}</PlainText>
          </Field>
        </div>
      </section>

      {/* ── 3. Tax Invoice (กรอกเอง) ── */}
      <section className="space-y-2">
        <GroupLabel>{t("groupTaxInvoice")}</GroupLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field className={viewFieldGap}>
            <FieldLabel
              className={viewLabelClass}
              htmlFor="cn-tax-invoice-no"
              required
            >
              {tfl("taxInvoiceNo")}
            </FieldLabel>
            {plainText ? (
              <PlainText>{form.getValues("tax_invoice_no")}</PlainText>
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
      </section>

      {/* ── 4. Notes ── */}
      <section className="space-y-2">
        <GroupLabel>{t("groupNotes")}</GroupLabel>
        <Field>
          <FieldLabel htmlFor="cn-description" className="sr-only">
            {tfl("description")}
          </FieldLabel>
          {plainText ? (
            <p className="min-h-8 text-sm whitespace-pre-wrap">
              {form.getValues("description") || "—"}
            </p>
          ) : (
            <Textarea
              id="cn-description"
              placeholder={tfl("optional")}
              className="text-xs"
              rows={2}
              disabled={disabled}
              maxLength={256}
              {...form.register("description")}
            />
          )}
        </Field>
      </section>
    </div>
  );
}

/** หัวข้อกรุ๊ปของ field — มี hint ขวา (optional) + เส้นคั่นล่าง */
function GroupLabel({
  children,
  hint,
}: {
  readonly children: ReactNode;
  readonly hint?: string;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <h3 className="text-foreground text-sm font-semibold tracking-tight">
        {children}
      </h3>
      {hint && (
        <span className="text-muted-foreground text-[0.625rem]">{hint}</span>
      )}
    </div>
  );
}
