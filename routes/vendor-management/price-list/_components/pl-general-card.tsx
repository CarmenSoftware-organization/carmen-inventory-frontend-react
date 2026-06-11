
import { Controller, type UseFormReturn } from "react-hook-form";
import { useLocale } from "use-intl";
import { Field, FieldDatePicker, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { cn } from "@/lib/utils";
import type { PriceList } from "@/types/price-list";
import { CardLabel, DateCard, GlassCard, PlainText } from "@/components/share/glass-card";
import { formatLocalizedDate } from "@/lib/date-utils";
import type { PriceListFormValues } from "./pl-form-schema";

const LABEL_CLASS = cn(
  "text-muted-foreground text-[0.625rem] font-semibold tracking-[0.1em] uppercase",
);

interface PLGeneralCardProps {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly priceList?: PriceList;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly watchedFrom: string;
  readonly watchedTo: string;
  readonly tfl: (key: string) => string;
}

/** General info card — vendor, currency, description, note, effective dates */
export function PLGeneralCard({
  form,
  priceList,
  isView,
  isDisabled,
  watchedFrom,
  watchedTo,
  tfl,
}: PLGeneralCardProps) {
  return (
    <GlassCard>
      <CardLabel>{tfl("general")}</CardLabel>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <VendorField
          form={form}
          priceList={priceList}
          isView={isView}
          isDisabled={isDisabled}
          tfl={tfl}
        />
        <CurrencyField
          form={form}
          priceList={priceList}
          isView={isView}
          isDisabled={isDisabled}
          tfl={tfl}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <DateField
          form={form}
          isView={isView}
          isDisabled={isDisabled}
          name="effective_from_date"
          label={tfl("effectiveFrom")}
          placeholder={tfl("pickDate")}
          value={watchedFrom}
        />
        <DateField
          form={form}
          isView={isView}
          isDisabled={isDisabled}
          name="effective_to_date"
          label={tfl("effectiveTo")}
          placeholder={tfl("pickDate")}
          value={watchedTo}
          fromDateValue={watchedFrom}
          highlight
        />
      </div>

      <div className="mt-3">
        <TextField
          form={form}
          priceList={priceList}
          isView={isView}
          isDisabled={isDisabled}
          name="description"
          label={tfl("description")}
        />
      </div>
    </GlassCard>
  );
}

function VendorField({
  form,
  priceList,
  isView,
  isDisabled,
  tfl,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly priceList?: PriceList;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly tfl: (key: string) => string;
}) {
  return (
    <Field>
      <FieldLabel className={LABEL_CLASS}>
        {tfl("vendor")}
        {!isView && <span className="text-destructive">*</span>}
      </FieldLabel>
      {isView ? (
        <PlainText value={priceList?.vendor?.name} />
      ) : (
        <Controller
          control={form.control}
          name="vendor_id"
          render={({ field }) => (
            <LookupVendor
              value={field.value}
              onValueChange={field.onChange}
              disabled={isDisabled}
              className="h-8 w-full text-xs"
              defaultLabel={priceList?.vendor?.name}
              error={form.formState.errors.vendor_id?.message}
            />
          )}
        />
      )}
    </Field>
  );
}

function CurrencyField({
  form,
  priceList,
  isView,
  isDisabled,
  tfl,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly priceList?: PriceList;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly tfl: (key: string) => string;
}) {
  return (
    <Field>
      <FieldLabel className={LABEL_CLASS}>
        {tfl("currency")}
        {!isView && <span className="text-destructive">*</span>}
      </FieldLabel>
      {isView ? (
        <PlainText value={priceList?.currency?.name} />
      ) : (
        <Controller
          control={form.control}
          name="currency_id"
          render={({ field }) => (
            <LookupCurrency
              value={field.value}
              onValueChange={field.onChange}
              disabled={isDisabled}
              className="w-full text-xs"
              error={form.formState.errors.currency_id?.message}
            />
          )}
        />
      )}
    </Field>
  );
}

function TextField({
  form,
  priceList,
  isView,
  isDisabled,
  name,
  label,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly priceList?: PriceList;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly name: "description" | "note";
  readonly label: string;
}) {
  return (
    <Field>
      <FieldLabel className={LABEL_CLASS}>{label}</FieldLabel>
      {isView ? (
        <PlainText value={priceList?.[name]} multiline />
      ) : (
        <Textarea
          placeholder={label}
          rows={2}
          maxLength={256}
          disabled={isDisabled}
          className="bg-background/60 resize-none rounded-lg text-xs"
          {...form.register(name)}
        />
      )}
    </Field>
  );
}

function DateField({
  form,
  isView,
  isDisabled,
  name,
  label,
  placeholder,
  value,
  fromDateValue,
  highlight,
}: {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly name: "effective_from_date" | "effective_to_date";
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly fromDateValue?: string;
  readonly highlight?: boolean;
}) {
  const locale = useLocale();
  return (
    <DateCard label={label} value={value} highlight={highlight}>
      {isView ? (
        <PlainText value={value ? formatLocalizedDate(value, locale) : ""} />
      ) : (
        <Controller
          control={form.control}
          name={name}
          render={({ field }) => (
            <FieldDatePicker
              value={field.value}
              onValueChange={field.onChange}
              disabled={isDisabled}
              placeholder={placeholder}
              className="h-8 w-full border-0 bg-transparent text-xs shadow-none focus-visible:ring-0"
              fromDate={fromDateValue ? new Date(fromDateValue) : undefined}
              error={form.formState.errors[name]?.message}
            />
          )}
        />
      )}
    </DateCard>
  );
}
