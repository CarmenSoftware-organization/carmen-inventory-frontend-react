
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  Field,
  FieldLabel,
  FieldInput,
  FieldSelect,
} from "@/components/ui/field";
import { SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CUISINE_REGION_OPTIONS,
  CUISINE_REGION_LABEL_KEY,
} from "@/constant/cuisine";
import { Card } from "./cuisine-card-shell";
import type { CuisineFormValues } from "./cuisine-form-schema";

interface CuisineGeneralFieldsProps {
  readonly form: UseFormReturn<CuisineFormValues>;
  readonly isDisabled: boolean;
}

/** General info section — name · region · description */
export function CuisineGeneralFields({
  form,
  isDisabled,
}: CuisineGeneralFieldsProps) {
  const t = useTranslations("operationPlan.cuisine");
  const tfl = useTranslations("field");
  const tf = useTranslations("form");
  const errors = form.formState.errors;

  return (
    <Card label={tf("generalInfo")}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="cuisine-name" required>
            {tfl("name")}
          </FieldLabel>
          <FieldInput
            id="cuisine-name"
            placeholder={t("namePlaceholder")}
            className="h-8"
            disabled={isDisabled}
            maxLength={100}
            error={errors.name?.message}
            {...form.register("name")}
          />
        </Field>

        <Field>
          <FieldLabel required>{tfl("region")}</FieldLabel>
          <Controller
            control={form.control}
            name="region"
            render={({ field }) => (
              <FieldSelect
                value={field.value}
                onValueChange={field.onChange}
                placeholder={t("selectRegion")}
                className="h-8 w-full text-sm"
                disabled={isDisabled}
                error={errors.region?.message}
              >
                <SelectContent>
                  {CUISINE_REGION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {t(CUISINE_REGION_LABEL_KEY[opt.value])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </FieldSelect>
            )}
          />
        </Field>

        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="cuisine-description">
            {tfl("description")}
          </FieldLabel>
          <Textarea
            id="cuisine-description"
            placeholder={tfl("optional")}
            rows={2}
            disabled={isDisabled}
            maxLength={256}
            {...form.register("description")}
          />
        </Field>
      </div>
    </Card>
  );
}
