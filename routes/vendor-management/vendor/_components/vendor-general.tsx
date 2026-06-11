
import { Controller, useForm } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldInput, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LookupBuType } from "@/components/lookup/lookup-bu-type";
import { cn } from "@/lib/utils";
import { CardLabel, GlassCard, PlainText } from "@/components/share/glass-card";
import type { VendorFormValues } from "./vendor-form-schema";

const LABEL_CLASS = cn(
  "text-muted-foreground text-[0.625rem] font-semibold tracking-[0.1em] uppercase",
);

interface VendorGeneralProps {
  readonly form: ReturnType<typeof useForm<VendorFormValues>>;
  readonly isDisabled: boolean;
}

/** General info card — code, name, description, business types */
export function VendorGeneral({ form, isDisabled }: VendorGeneralProps) {
  const t = useTranslations("vendorManagement.vendor");
  const tfl = useTranslations("field");
  const isView = isDisabled && !form.formState.isSubmitting;

  const businessTypes = form.getValues("business_types");

  return (
    <GlassCard>
      <CardLabel>{tfl("general")}</CardLabel>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="vendor-code" className={LABEL_CLASS}>
            {tfl("code")}
            {!isView && <span className="text-destructive">*</span>}
          </FieldLabel>
          {isView ? (
            <PlainText value={form.getValues("code")} />
          ) : (
            <FieldInput
              id="vendor-code"
              placeholder={t("codePlaceholder")}
              className="h-8 text-xs"
              disabled={isDisabled}
              error={form.formState.errors.code?.message}
              maxLength={10}
              {...form.register("code")}
            />
          )}
        </Field>

        <Field>
          <FieldLabel className={LABEL_CLASS}>{tfl("businessType")}</FieldLabel>
          {isView ? (
            <PlainText
              value={
                businessTypes && businessTypes.length > 0
                  ? businessTypes.map((b) => b.name).join(", ")
                  : null
              }
            />
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
      </div>

      <div className="mt-3">
        <Field>
          <FieldLabel htmlFor="vendor-description" className={LABEL_CLASS}>
            {tfl("description")}
          </FieldLabel>
          {isView ? (
            <PlainText value={form.getValues("description")} multiline />
          ) : (
            <Textarea
              id="vendor-description"
              placeholder={tfl("optional")}
              rows={2}
              maxLength={256}
              disabled={isDisabled}
              className="bg-background/60 resize-none rounded-lg text-xs"
              {...form.register("description")}
            />
          )}
        </Field>
      </div>
    </GlassCard>
  );
}
