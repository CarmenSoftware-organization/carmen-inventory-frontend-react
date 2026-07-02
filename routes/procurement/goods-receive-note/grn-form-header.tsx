import { useEffect, useMemo, type ReactNode } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldDatePicker,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { LookupCreditTerm } from "@/components/lookup/lookup-credit-term";
import { formatExchangeRate } from "@/lib/currency-utils";
import { useProfile } from "@/hooks/use-profile";
import { useCurrency } from "@/hooks/use-currency";
import type { GrnFormValues } from "./grn-form-schema";

interface GrnFormHeaderProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  readonly fromWizard?: boolean;
  /** view mode → แสดงทุก field เป็น plain text แทน input (เหมือน CN) */
  readonly plainText?: boolean;
}

/** ค่าเป็น plain text (view mode) — value เด่น (เข้ม/medium/sm) ให้เกิด
 *  lightness+size contrast เหนือ label ที่เงียบ (เหมือน CN/PO) */
function PlainText({ children }: { readonly children: ReactNode }) {
  return (
    <span className="text-foreground inline-flex min-h-8 items-center text-sm font-medium">
      {children || "—"}
    </span>
  );
}

export function GrnFormHeader({
  form,
  disabled,
  fromWizard = false,
  plainText = false,
}: GrnFormHeaderProps) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { defaultCurrencyId } = useProfile();
  const errors = form.formState.errors;

  const vendorName = useWatch({ control: form.control, name: "vendor_name" });
  const docType = useWatch({ control: form.control, name: "doc_type" });
  const isPo = docType === "purchase_order";
  const currencyId = useWatch({ control: form.control, name: "currency_id" });
  const { data: currencyData } = useCurrency({ perpage: -1 });
  const currencies = useMemo(
    () => currencyData?.data?.filter((c) => c.is_active) ?? [],
    [currencyData?.data],
  );

  useEffect(() => {
    if (disabled) return;
    if (currencyId) return;
    if (!defaultCurrencyId || currencies.length === 0) return;
    const currency = currencies.find((c) => c.id === defaultCurrencyId);
    if (!currency) return;
    if (form.getValues("currency_id") === defaultCurrencyId) return;
    form.setValue("currency_id", defaultCurrencyId);
    form.setValue("currency_name", currency.code);
    form.setValue("exchange_rate", currency.exchange_rate);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- form is stable (useForm ref)
  }, [currencyId, defaultCurrencyId, currencies, disabled]);

  const postTypeLabels: Record<string, string> = {
    ap: t("ap"),
    consignment: t("consignment"),
    cash: t("cash"),
  };

  // view mode → คู่ label↔value ชิด (gap-1) + label เงียบ (เทา/ปกติ) ให้ value
  // เด่นกว่า สร้าง proximity grouping + lightness contrast แบบ Apple (เหมือน CN)
  const viewFieldGap = plainText ? "gap-1" : undefined;
  const viewLabelClass = plainText
    ? "text-muted-foreground font-normal"
    : undefined;

  return (
    <div className="space-y-3">
      <h2 className="text-foreground text-sm font-semibold tracking-tight">
        {t("docInfo")}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass} required>
            {tfl("vendor")}
          </FieldLabel>
          <Controller
            control={form.control}
            name="vendor_id"
            render={({ field }) => (
              <LookupVendor
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onItemChange={(v) => form.setValue("vendor_name", v.name)}
                defaultLabel={vendorName || undefined}
                disabled={disabled || isPo}
                readOnly={plainText}
                error={errors.vendor_id?.message}
                className="h-9 text-xs"
              />
            )}
          />
        </Field>
        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass} required>
            {t("receivedAt")}
          </FieldLabel>
          <Controller
            control={form.control}
            name="received_at"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                readOnly={plainText}
                placeholder={tc("selectDate")}
                className="h-9 w-full text-xs"
                error={errors.received_at?.message}
              />
            )}
          />
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass} htmlFor="grn-invoice-no" required>
            {tfl("invoiceNo")}
          </FieldLabel>
          {plainText ? (
            <PlainText>{form.getValues("invoice_no")}</PlainText>
          ) : (
            <FieldInput
              id="grn-invoice-no"
              placeholder={t("invoiceNoPlaceholder")}
              className="h-9"
              disabled={disabled}
              error={errors.invoice_no?.message}
              {...form.register("invoice_no")}
            />
          )}
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass} required>
            {t("invoiceDate")}
          </FieldLabel>
          <Controller
            control={form.control}
            name="invoice_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                readOnly={plainText}
                placeholder={tc("selectDate")}
                className="h-9 w-full text-xs"
                error={errors.invoice_date?.message}
              />
            )}
          />
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass} required>
            {tfl("currency")}
          </FieldLabel>
          <Controller
            control={form.control}
            name="currency_id"
            render={({ field }) => (
              <LookupCurrency
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled || fromWizard}
                readOnly={plainText}
                error={errors.currency_id?.message}
                className="h-9 w-full text-xs"
              />
            )}
          />
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass} htmlFor="grn-exchange-rate">
            {tfl("exchangeRate")}
          </FieldLabel>
          {plainText ? (
            <PlainText>
              {formatExchangeRate(form.getValues("exchange_rate"))}
            </PlainText>
          ) : (
            <FieldInput
              id="grn-exchange-rate"
              type="number"
              inputMode="decimal"
              step="0.0001"
              className="h-9 text-right"
              disabled
              {...form.register("exchange_rate")}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass}>{tfl("creditTerm")}</FieldLabel>
          {plainText ? (
            <PlainText>{form.getValues("credit_term_name")}</PlainText>
          ) : (
            <Controller
              control={form.control}
              name="credit_term_id"
              render={({ field }) => (
                <LookupCreditTerm
                  value={field.value ?? ""}
                  onValueChange={(value, creditTerm) => {
                    field.onChange(value);
                    if (creditTerm) {
                      form.setValue("credit_term_name", creditTerm.name);
                      form.setValue("credit_term_days", creditTerm.value);
                    }
                  }}
                  className="h-9 w-full text-xs"
                  disabled={disabled}
                />
              )}
            />
          )}
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass}>{t("dueDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="payment_due_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                readOnly={plainText}
                placeholder={tc("selectDate")}
                className="h-9 w-full text-xs"
              />
            )}
          />
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass}>{t("postType")}</FieldLabel>
          <Controller
            control={form.control}
            name="post_type"
            render={({ field }) =>
              plainText ? (
                <PlainText>{postTypeLabels[field.value]}</PlainText>
              ) : (
                <FieldSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled}
                  className="h-9 w-full text-xs"
                  error={errors.post_type?.message}
                >
                  <SelectContent>
                    <SelectItem value="ap">{t("ap")}</SelectItem>
                    <SelectItem value="consignment">
                      {t("consignment")}
                    </SelectItem>
                    <SelectItem value="cash">{t("cash")}</SelectItem>
                  </SelectContent>
                </FieldSelect>
              )
            }
          />
        </Field>
      </div>

      <Field className={viewFieldGap}>
        <FieldLabel className={viewLabelClass} htmlFor="grn-description">
          {tfl("description")}
        </FieldLabel>
        {plainText ? (
          <p className="min-h-8 text-sm whitespace-pre-wrap">
            {form.getValues("description") || "—"}
          </p>
        ) : (
          <Textarea
            id="grn-description"
            placeholder={t("descriptionPlaceholder")}
            maxLength={256}
            disabled={disabled}
            {...form.register("description")}
          />
        )}
      </Field>
    </div>
  );
}
