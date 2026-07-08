import { Controller, type UseFormReturn } from "react-hook-form";
import { useLocale } from "use-intl";
import {
  Field,
  FieldDatePicker,
  FieldInput,
  FieldLabel,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LookupCurrency } from "@/components/lookup/lookup-currency";
import { LookupVendor } from "@/components/lookup/lookup-vendor";
import { PlainText } from "@/components/share/glass-card";
import { PRICE_LIST_STATUS_OPTIONS } from "@/constant/price-list";
import { formatLocalizedDate } from "@/lib/date-utils";
import { SettingSection } from "../../system-admin/business-setting/business-setting-ui";
import type { PriceList } from "@/types/price-list";
import type { PriceListFormValues } from "./pl-form-schema";

type PlStatus = "draft" | "active" | "inactive";

interface PLGeneralCardProps {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly priceList?: PriceList;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly watchedFrom: string;
  readonly watchedTo: string;
  readonly tfl: (key: string) => string;
  readonly t: (key: string) => string;
  readonly ts: (key: PlStatus) => string;
}

/** General section — name, vendor, currency, effective dates, description, status */
export function PLGeneralCard({
  form,
  priceList,
  isView,
  isDisabled,
  watchedFrom,
  watchedTo,
  tfl,
  t,
  ts,
}: PLGeneralCardProps) {
  const locale = useLocale();

  return (
    <SettingSection first title={tfl("general")} description={t("generalDesc")}>
      {/* Name */}
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="pl-name">
          {tfl("name")}
          {!isView && <span className="text-destructive"> *</span>}
        </FieldLabel>
        {isView ? (
          <PlainText value={form.getValues("name")} />
        ) : (
          <FieldInput
            id="pl-name"
            placeholder={t("namePlaceholder")}
            disabled={isDisabled}
            error={form.formState.errors.name?.message}
            maxLength={100}
            {...form.register("name")}
          />
        )}
      </Field>

      {/* Vendor */}
      <Field>
        <FieldLabel>
          {tfl("vendor")}
          {!isView && <span className="text-destructive"> *</span>}
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
                className="w-full"
                defaultLabel={priceList?.vendor?.name}
                error={form.formState.errors.vendor_id?.message}
              />
            )}
          />
        )}
      </Field>

      {/* Currency */}
      <Field>
        <FieldLabel>
          {tfl("currency")}
          {!isView && <span className="text-destructive"> *</span>}
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
                fullWidth
                error={form.formState.errors.currency_id?.message}
              />
            )}
          />
        )}
      </Field>

      {/* Effective from */}
      <Field>
        <FieldLabel>{tfl("effectiveFrom")}</FieldLabel>
        {isView ? (
          <PlainText
            value={watchedFrom ? formatLocalizedDate(watchedFrom, locale) : ""}
          />
        ) : (
          <Controller
            control={form.control}
            name="effective_from_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
                className="w-full"
                placeholder={tfl("pickDate")}
                error={form.formState.errors.effective_from_date?.message}
              />
            )}
          />
        )}
      </Field>

      {/* Effective to */}
      <Field>
        <FieldLabel>{tfl("effectiveTo")}</FieldLabel>
        {isView ? (
          <PlainText
            value={watchedTo ? formatLocalizedDate(watchedTo, locale) : ""}
          />
        ) : (
          <Controller
            control={form.control}
            name="effective_to_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
                className="w-full"
                placeholder={tfl("pickDate")}
                fromDate={watchedFrom ? new Date(watchedFrom) : undefined}
                error={form.formState.errors.effective_to_date?.message}
              />
            )}
          />
        )}
      </Field>

      {/* Description */}
      <Field className="sm:col-span-2">
        <FieldLabel>{tfl("description")}</FieldLabel>
        {isView ? (
          <PlainText value={priceList?.description} multiline />
        ) : (
          <Textarea
            placeholder={tfl("optional")}
            rows={2}
            maxLength={256}
            disabled={isDisabled}
            className="resize-none"
            {...form.register("description")}
          />
        )}
      </Field>

      {/* Status */}
      <Field className="sm:col-span-2">
        <FieldLabel>{tfl("status")}</FieldLabel>
        {isView ? (
          <div>
            <Badge variant="secondary" size="sm">
              {ts(form.getValues("status") as PlStatus)}
            </Badge>
          </div>
        ) : (
          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <FieldSelect
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
                placeholder={tfl("selectStatus")}
                error={form.formState.errors.status?.message}
              >
                <SelectContent>
                  {PRICE_LIST_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {ts(opt.value as PlStatus)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </FieldSelect>
            )}
          />
        )}
      </Field>
    </SettingSection>
  );
}
