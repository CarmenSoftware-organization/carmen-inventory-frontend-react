
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "./cuisine-card-shell";
import type { CuisineFormValues } from "./cuisine-form-schema";

interface CuisineAdditionalFieldsProps {
  readonly form: UseFormReturn<CuisineFormValues>;
  readonly isDisabled: boolean;
}

/** Additional info — note · is_active */
export function CuisineAdditionalFields({
  form,
  isDisabled,
}: CuisineAdditionalFieldsProps) {
  const t = useTranslations("operationPlan.cuisine");
  const tfl = useTranslations("field");

  return (
    <Card label={t("additional")}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor="cuisine-note">{tfl("note")}</FieldLabel>
          <Textarea
            id="cuisine-note"
            placeholder={tfl("optional")}
            rows={2}
            disabled={isDisabled}
            maxLength={256}
            {...form.register("note")}
          />
        </Field>

        <Controller
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <StatusSwitch
              id="cuisine-is-active"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isDisabled}
            />
          )}
        />
      </FieldGroup>
    </Card>
  );
}
