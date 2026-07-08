import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldInput,
  FieldLabel,
  FieldPlainText,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LookupBuType } from "@/components/lookup/lookup-bu-type";
import { StatusSwitch } from "@/components/ui/status-switch";
import { StatusBadge } from "@/components/ui/status-badge";
import { SettingSection } from "@/components/ui/setting-section";
import type { VendorFormValues } from "./vendor-form-schema";

interface VendorGeneralProps {
  readonly form: ReturnType<typeof useForm<VendorFormValues>>;
  readonly isDisabled: boolean;
}

/** General section — name, code, business type, description, status */
export function VendorGeneral({ form, isDisabled }: VendorGeneralProps) {
  const t = useTranslations("vendorManagement.vendor");
  const tfl = useTranslations("field");
  const isView = isDisabled && !form.formState.isSubmitting;

  const businessTypes = form.getValues("business_types");

  return (
    <SettingSection first title={tfl("general")} description={t("generalDesc")}>
      {/* Name */}
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="vendor-name">
          {tfl("name")}
          {!isView && <span className="text-destructive"> *</span>}
        </FieldLabel>
        {isView ? (
          <FieldPlainText>{form.getValues("name")}</FieldPlainText>
        ) : (
          <FieldInput
            id="vendor-name"
            placeholder={t("namePlaceholder")}
            disabled={isDisabled}
            error={form.formState.errors.name?.message}
            maxLength={100}
            {...form.register("name")}
          />
        )}
      </Field>

      {/* Code */}
      <Field>
        <FieldLabel htmlFor="vendor-code">
          {tfl("code")}
          {!isView && <span className="text-destructive"> *</span>}
        </FieldLabel>
        {isView ? (
          <FieldPlainText>{form.getValues("code")}</FieldPlainText>
        ) : (
          <FieldInput
            id="vendor-code"
            placeholder={t("codePlaceholder")}
            disabled={isDisabled}
            error={form.formState.errors.code?.message}
            maxLength={10}
            {...form.register("code")}
          />
        )}
      </Field>

      {/* Business type */}
      <Field>
        <FieldLabel>{tfl("businessType")}</FieldLabel>
        {isView ? (
          <FieldPlainText>
            {businessTypes && businessTypes.length > 0
              ? businessTypes.map((b) => b.name).join(", ")
              : null}
          </FieldPlainText>
        ) : (
          <Controller
            control={form.control}
            name="business_types"
            render={({ field }) => (
              <LookupBuType
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
              />
            )}
          />
        )}
      </Field>

      {/* Description */}
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="vendor-description">
          {tfl("description")}
        </FieldLabel>
        {isView ? (
          <FieldPlainText className="items-start whitespace-pre-wrap">
            {form.getValues("description")}
          </FieldPlainText>
        ) : (
          <Textarea
            id="vendor-description"
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
            <StatusBadge active={form.getValues("is_active")} />
          </div>
        ) : (
          <Controller
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <StatusSwitch
                id="vendor-is-active"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isDisabled}
              />
            )}
          />
        )}
      </Field>
    </SettingSection>
  );
}
