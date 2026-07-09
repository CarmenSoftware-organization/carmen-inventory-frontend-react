import { useEffect, useMemo } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldDatePicker,
  FieldInput,
  FieldLabel,
  FieldPlainText,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
  InputSuffixPlain,
} from "@/components/ui/input/input-suffix";
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
  const currencyName = useWatch({
    control: form.control,
    name: "currency_name",
  });
  const { data: currencyData } = useCurrency({ perpage: -1 });
  const currencies = useMemo(
    () => currencyData?.data?.filter((c) => c.is_active) ?? [],
    [currencyData?.data],
  );
  // currency code สำหรับต่อท้าย exchange rate — derive จาก list ตาม currencyId
  // ให้ reactive ตอนเปลี่ยนสกุลเงิน, fallback เป็น currency_name ที่โหลดมา
  const currencyCode =
    currencies.find((c) => c.id === currencyId)?.code || currencyName;

  useEffect(() => {
    if (disabled) return;
    if (currencyId) return;
    if (!defaultCurrencyId || currencies.length === 0) return;
    const currency = currencies.find((c) => c.id === defaultCurrencyId);
    if (!currency) return;
    if (form.getValues("currency_id") === defaultCurrencyId) return;
    // reset baseline (ไม่ใช่ setValue) ให้ค่า currency default เป็น default ของฟอร์ม
    // — RHF คิด isDirty จาก deepEqual(getValues, defaultValues) ทั้งฟอร์ม; setValue
    // ค่าที่ต่างจาก default จะค้าง dirty ทั้งที่ยังไม่ได้กรอก → back ติด discard
    // (ดู pr-form.tsx). ใช้ formState.defaultValues เป็น baseline (component นี้เป็น
    // ลูก ไม่มี defaultValues ตรง ๆ); keepDirtyValues คงค่าที่ผู้ใช้แก้ไว้
    form.reset(
      {
        ...form.formState.defaultValues,
        currency_id: defaultCurrencyId,
        currency_name: currency.code,
        exchange_rate: currency.exchange_rate,
      },
      { keepDirtyValues: true },
    );
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
    <div className="space-y-2">
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
          <FieldLabel
            className={viewLabelClass}
            htmlFor="grn-invoice-no"
            required
          >
            {tfl("invoiceNo")}
          </FieldLabel>
          {plainText ? (
            <FieldPlainText className="text-xs">
              {form.getValues("invoice_no")}
            </FieldPlainText>
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
          <FieldLabel
            className={viewLabelClass}
            htmlFor="grn-exchange-rate"
            required
          >
            {tfl("currency")}
          </FieldLabel>
          {plainText ? (
            <InputSuffixPlain
              className="inline-flex min-h-8 items-center text-left text-xs"
              value={formatExchangeRate(form.getValues("exchange_rate"))}
              suffix={currencyCode}
            />
          ) : (
            <InputSuffixField
              className="h-9"
              disabled={disabled}
              error={!!errors.currency_id?.message}
            >
              <InputSuffixInput
                id="grn-exchange-rate"
                type="number"
                inputMode="decimal"
                step="0.0001"
                disabled={disabled}
                {...form.register("exchange_rate")}
              />
              <InputSuffixAddon>
                <Controller
                  control={form.control}
                  name="currency_id"
                  render={({ field }) => (
                    <LookupCurrency
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      onItemChange={(currency) => {
                        form.setValue("currency_name", currency.code);
                        form.setValue("exchange_rate", currency.exchange_rate);
                      }}
                      disabled={disabled || fromWizard}
                      className="h-full w-24 rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus-visible:ring-0"
                    />
                  )}
                />
              </InputSuffixAddon>
            </InputSuffixField>
          )}
        </Field>
        <Field className={viewFieldGap}>
          <FieldLabel className={viewLabelClass}>
            {tfl("creditTerm")}
          </FieldLabel>
          {plainText ? (
            <FieldPlainText className="text-xs">
              {form.getValues("credit_term_name")}
            </FieldPlainText>
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
                <FieldPlainText className="text-xs">
                  {postTypeLabels[field.value]}
                </FieldPlainText>
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
    </div>
  );
}
