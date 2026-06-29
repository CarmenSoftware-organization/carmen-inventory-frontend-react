import { useEffect, useMemo } from "react";
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
import { useProfile } from "@/hooks/use-profile";
import { useCurrency } from "@/hooks/use-currency";
import type { GrnFormValues } from "./grn-form-schema";

interface GrnFormHeaderProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly disabled: boolean;
  readonly fromWizard?: boolean;
}

export function GrnFormHeader({
  form,
  disabled,
  fromWizard = false,
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

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">{t("docInfo")}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel required>{tfl("vendor")}</FieldLabel>
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
                className="h-9"
                error={errors.vendor_id?.message}
              />
            )}
          />
        </Field>
        <Field>
          <FieldLabel required>{t("receivedAt")}</FieldLabel>
          <Controller
            control={form.control}
            name="received_at"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                placeholder={tc("selectDate")}
                className="h-9 w-full text-xs"
                error={errors.received_at?.message}
              />
            )}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="grn-invoice-no" required>
            {tfl("invoiceNo")}
          </FieldLabel>
          <FieldInput
            id="grn-invoice-no"
            placeholder={t("invoiceNoPlaceholder")}
            className="h-9"
            disabled={disabled}
            error={errors.invoice_no?.message}
            {...form.register("invoice_no")}
          />
        </Field>

        <Field>
          <FieldLabel required>{t("invoiceDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="invoice_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                placeholder={tc("selectDate")}
                className="h-9 w-full text-xs"
                error={errors.invoice_date?.message}
              />
            )}
          />
        </Field>

        <Field>
          <FieldLabel required>{tfl("currency")}</FieldLabel>
          <Controller
            control={form.control}
            name="currency_id"
            render={({ field }) => (
              <LookupCurrency
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled || fromWizard}
                error={errors.currency_id?.message}
              />
            )}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="grn-exchange-rate">
            {tfl("exchangeRate")}
          </FieldLabel>
          <FieldInput
            id="grn-exchange-rate"
            type="number"
            inputMode="decimal"
            step="0.0001"
            className="h-9 text-right"
            disabled
            {...form.register("exchange_rate")}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field>
          <FieldLabel>{tfl("creditTerm")}</FieldLabel>
          <Controller
            control={form.control}
            name="credit_term_id"
            render={({ field }) => (
              <LookupCreditTerm
                value={field.value ?? ""}
                onValueChange={(value, creditTerm) => {
                  field.onChange(value);
                  if (creditTerm) {
                    form.setValue("credit_term_days", creditTerm.value);
                  }
                }}
                disabled={disabled}
              />
            )}
          />
        </Field>

        <Field>
          <FieldLabel>{t("dueDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="payment_due_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={disabled}
                placeholder={tc("selectDate")}
                className="w-full text-xs"
              />
            )}
          />
        </Field>

        <Field>
          <FieldLabel>{t("postType")}</FieldLabel>
          <Controller
            control={form.control}
            name="post_type"
            render={({ field }) => (
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
            )}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor="grn-description">{tfl("description")}</FieldLabel>
        <Textarea
          id="grn-description"
          placeholder={t("descriptionPlaceholder")}
          maxLength={256}
          disabled={disabled}
          {...form.register("description")}
        />
      </Field>
    </div>
  );
}
