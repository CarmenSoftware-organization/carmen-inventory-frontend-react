
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LookupLocation } from "@/components/lookup/lookup-location";
import { cn } from "@/lib/utils";
import { getSpotCheckMethodLabel } from "@/constant/spot-check-method";
import {
  CardLabel,
  GlassCard,
  PlainText,
} from "@/components/share/glass-card";
import type { SpotCheckFormValues } from "./sc-form-schema";
import { ScMethodPicker } from "./sc-method-picker";

const LABEL_CLASS = cn(
  "text-muted-foreground text-[0.625rem] font-semibold tracking-[0.1em] uppercase",
);

const INPUT_CLASS = cn(
  "border-border/40 hover:border-foreground/50 focus-visible:border-primary",
  "h-8 rounded-md border bg-transparent text-right text-xs shadow-none",
  "transition-colors focus-visible:ring-0",
);

interface ScGeneralFieldsProps {
  readonly form: UseFormReturn<SpotCheckFormValues>;
  readonly disabled: boolean;
  readonly isView?: boolean;
  /** ซ่อน location_id field — ใช้กับ entry mode ที่ pre-fill location จาก URL */
  readonly hideLocation?: boolean;
}

/** General settings card — method picker (3 cards) + location + items + min_value + description */
export function ScGeneralFields({
  form,
  disabled,
  isView,
  hideLocation,
}: ScGeneralFieldsProps) {
  const t = useTranslations("inventoryManagement.spotCheck");
  const tfl = useTranslations("field");
  const method = useWatch({ control: form.control, name: "method" });
  const view = !!isView;

  const methodViewLabel = getSpotCheckMethodLabel(t, method);

  return (
    <GlassCard>
      <CardLabel>{tfl("general")}</CardLabel>

      {/* Method radio cards */}
      <Field data-invalid={!!form.formState.errors.method}>
        <FieldLabel className={LABEL_CLASS}>
          {tfl("method")}
          {!view && <span className="text-destructive">*</span>}
        </FieldLabel>
        {view ? (
          <PlainText value={methodViewLabel} />
        ) : (
          <Controller
            control={form.control}
            name="method"
            render={({ field }) => (
              <ScMethodPicker
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
              />
            )}
          />
        )}
        <FieldError>{form.formState.errors.method?.message}</FieldError>
      </Field>

      {/* Location + items + min_value */}
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {!hideLocation && (
          <Field data-invalid={!!form.formState.errors.location_id}>
            <FieldLabel htmlFor="sc-location" className={LABEL_CLASS}>
              {tfl("location")}
              {!view && <span className="text-destructive">*</span>}
            </FieldLabel>
            {view ? (
              <PlainText value={form.getValues("location_id") || null} />
            ) : (
              <Controller
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <LookupLocation
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={disabled}
                    className="h-8 w-full text-xs"
                  />
                )}
              />
            )}
            <FieldError>
              {form.formState.errors.location_id?.message}
            </FieldError>
          </Field>
        )}

        {(method === "random" || method === "high_value") && (
          <Field data-invalid={!!form.formState.errors.items}>
            <FieldLabel htmlFor="sc-items" className={LABEL_CLASS}>
              {tfl("items")}
              {!view && <span className="text-destructive">*</span>}
            </FieldLabel>
            {view ? (
              <PlainText value={String(form.getValues("items") ?? "")} />
            ) : (
              <Input
                id="sc-items"
                type="number"
                inputMode="decimal"
                min={1}
                placeholder="0"
                className={INPUT_CLASS}
                disabled={disabled}
                {...form.register("items", { valueAsNumber: true })}
              />
            )}
            <FieldError>{form.formState.errors.items?.message}</FieldError>
          </Field>
        )}

        {method === "high_value" && (
          <Field data-invalid={!!form.formState.errors.min_value}>
            <FieldLabel htmlFor="sc-min-value" className={LABEL_CLASS}>
              {tfl("minValue")}
              {!view && <span className="text-destructive">*</span>}
            </FieldLabel>
            {view ? (
              <PlainText value={String(form.getValues("min_value") ?? "")} />
            ) : (
              <Input
                id="sc-min-value"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                placeholder="0"
                className={INPUT_CLASS}
                disabled={disabled}
                {...form.register("min_value", { valueAsNumber: true })}
              />
            )}
            <FieldError>{form.formState.errors.min_value?.message}</FieldError>
          </Field>
        )}
      </div>

      {/* Description */}
      <div className="mt-3">
        <Field data-invalid={!!form.formState.errors.description}>
          <FieldLabel htmlFor="sc-description" className={LABEL_CLASS}>
            {tfl("description")}
          </FieldLabel>
          {view ? (
            <PlainText value={form.getValues("description")} multiline />
          ) : (
            <Textarea
              id="sc-description"
              maxLength={256}
              placeholder={tfl("optional")}
              rows={2}
              className="bg-background/60 resize-none rounded-lg text-xs"
              disabled={disabled}
              {...form.register("description")}
            />
          )}
          <FieldError>{form.formState.errors.description?.message}</FieldError>
        </Field>
      </div>
    </GlassCard>
  );
}

