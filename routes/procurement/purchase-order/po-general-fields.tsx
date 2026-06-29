
import { useEffect, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDatePicker,
} from "@/components/ui/field";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { LookupCreditTerm } from "@/components/lookup/lookup-credit-term";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { useCurrency } from "@/hooks/use-currency";
import { useProfile } from "@/hooks/use-profile";
import { formatExchangeRate } from "@/lib/currency-utils";
import { formatDate } from "@/lib/date-utils";
import { LookupWorkflow } from "@/components/lookup/lookup-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import type { PoFormValues } from "./po-form-schema";
import { Input } from "@/components/ui/input";

interface PoGeneralFieldsProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly disabled: boolean;
  readonly isManual: boolean;
  readonly readOnly?: boolean;
  /** view/locked → แสดงค่าทุก field เป็น plain text แทน input */
  readonly plainText?: boolean;
}

/** Field ที่แสดงค่าเป็น plain text (ใช้ใน view/locked mode) */
function PlainField({
  label,
  value,
  children,
}: {
  readonly label: string;
  readonly value?: string;
  readonly children?: ReactNode;
}) {
  // gap-1 (4px) ภายในคู่ label↔value ให้ชิดกันเป็นชุดเดียว — แถวต่อแถวเว้น 16px
  // (gap-y-4) สร้าง proximity grouping แบบ Apple (intra ชิดกว่า inter มากๆ)
  return (
    <Field className="gap-1">
      {/* view mode: label เงียบ (เทา/ปกติ) — value เด่น (เข้ม/medium)
          สร้าง hierarchy ด้วย lightness contrast แบบ Apple ไม่ให้ทั้งคู่เข้มเท่ากัน */}
      <FieldLabel className="text-muted-foreground font-normal">
        {label}
      </FieldLabel>
      {children ?? (
        <span className="text-foreground inline-flex min-h-8 items-center text-sm font-medium">
          {value || "—"}
        </span>
      )}
    </Field>
  );
}

export function PoGeneralFields({
  form,
  disabled,
  isManual,
  readOnly = false,
  plainText = false,
}: PoGeneralFieldsProps) {
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const { defaultCurrencyId, defaultCurrencyCode, dateFormat } = useProfile();

  const exchangeRate = useWatch({
    control: form.control,
    name: "exchange_rate",
  });
  const currencyId = useWatch({ control: form.control, name: "currency_id" });

  const { data: currencyData } = useCurrency({ perpage: -1 });

  const creditTermId = useWatch({
    control: form.control,
    name: "credit_term_id",
  });

  useEffect(() => {
    const currencies = currencyData?.data?.filter((c) => c.is_active) ?? [];
    if (!currencyId && defaultCurrencyId && currencies.length > 0) {
      const currency = currencies.find((c) => c.id === defaultCurrencyId);
      if (currency) {
        form.setValue("currency_id", defaultCurrencyId);
        form.setValue("currency_code", currency.code);
        form.setValue("exchange_rate", currency.exchange_rate);
      }
    }
  }, [currencyId, defaultCurrencyId, currencyData?.data, form]);

  // Fields editable only when PO is manual (linked PO locks these)
  const fieldDisabled = disabled || readOnly;
  const manualFieldDisabled = fieldDisabled || !isManual;

  // View/locked/disabled → แสดงทุก field เป็น plain text (workflow ใช้ lookup
  // readOnly เพราะไม่ได้เก็บ workflow_name; ที่เหลืออ่านจาก *_name/_code ที่เก็บไว้)
  if (plainText || disabled) {
    const v = form.getValues();
    return (
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <PlainField label={tfl("workflow")}>
            <LookupWorkflow
              value={v.workflow_id}
              onValueChange={() => {}}
              workflowType={WORKFLOW_TYPE.PO}
              readOnly
              className="text-xs"
            />
          </PlainField>
          <PlainField label={tfl("vendor")} value={v.vendor_name} />
          <PlainField label={tfl("creditTerm")} value={v.credit_term_name} />
          <PlainField
            label={tfl("deliveryDate")}
            value={
              v.delivery_date ? formatDate(v.delivery_date, dateFormat) : ""
            }
          />
          <PlainField label={tfl("currency")} value={v.currency_code} />
          <PlainField
            label={tfl("exchangeRate")}
            value={formatExchangeRate(v.exchange_rate, defaultCurrencyCode)}
          />
        </div>
      </FieldGroup>
    );
  }

  return (
    <FieldGroup className="gap-4">
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field>
          <FieldLabel required>{tfl("workflow")}</FieldLabel>
          <Controller
            control={form.control}
            name="workflow_id"
            render={({ field, fieldState }) => (
              <LookupWorkflow
                value={field.value}
                onValueChange={field.onChange}
                workflowType={WORKFLOW_TYPE.PO}
                disabled={manualFieldDisabled}
                className="w-full text-xs"
                error={fieldState.error?.message}
              />
            )}
          />
        </Field>
        <Field>
          <FieldLabel required>{tfl("vendor")}</FieldLabel>
          <Controller
            control={form.control}
            name="vendor_id"
            render={({ field, fieldState }) => (
              <LookupVendor
                value={field.value}
                onValueChange={field.onChange}
                onItemChange={(vendor) => {
                  form.setValue("vendor_name", vendor.name);
                }}
                disabled={manualFieldDisabled}
                error={fieldState.error?.message}
                className="text-xs"
              />
            )}
          />
        </Field>

        <Field>
          <FieldLabel>{tfl("creditTerm")}</FieldLabel>
          <LookupCreditTerm
            value={creditTermId}
            onValueChange={(val, creditTerm) => {
              form.setValue("credit_term_id", val);
              if (creditTerm) {
                form.setValue("credit_term_name", creditTerm.name);
                form.setValue("credit_term_value", creditTerm.value);
              }
            }}
            disabled={fieldDisabled}
          />
        </Field>
        <Field>
          <FieldLabel required>{tfl("deliveryDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="delivery_date"
            render={({ field, fieldState }) => (
              <FieldDatePicker
                value={field.value}
                onValueChange={field.onChange}
                disabled={manualFieldDisabled}
                placeholder={tc("selectDate")}
                className="w-full text-xs"
                error={fieldState.error?.message}
              />
            )}
          />
        </Field>
        <Field>
          <FieldLabel required>{tfl("currency")}</FieldLabel>
          <Controller
            control={form.control}
            name="currency_id"
            render={({ field, fieldState }) => (
              <LookupCurrency
                value={field.value}
                onValueChange={field.onChange}
                onItemChange={(currency) => {
                  form.setValue("currency_code", currency.code);
                  form.setValue("exchange_rate", currency.exchange_rate);
                }}
                disabled={manualFieldDisabled}
                size="sm"
                className="w-full text-xs"
                error={fieldState.error?.message}
              />
            )}
          />
        </Field>
        <Field>
          <FieldLabel>{tfl("exchangeRate")}</FieldLabel>
          <Input
            value={formatExchangeRate(exchangeRate, defaultCurrencyCode)}
            disabled
            readOnly
            className="h-8 text-right"
          />
        </Field>
      </div>
    </FieldGroup>
  );
}
