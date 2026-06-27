
import type { UseFormReturn, FieldPath } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "./cuisine-card-shell";
import type { CuisineFormValues } from "./cuisine-form-schema";

interface CuisineDetailFieldsProps {
  readonly form: UseFormReturn<CuisineFormValues>;
  readonly isDisabled: boolean;
}

/** Cuisine details — popular dishes · key ingredients · info · dimension */
export function CuisineDetailFields({
  form,
  isDisabled,
}: CuisineDetailFieldsProps) {
  const t = useTranslations("operationPlan.cuisine");
  const tfl = useTranslations("field");

  return (
    <Card label={t("cuisineDetails")}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailTextarea
          form={form}
          name="popular_dishes"
          id="cuisine-popular-dishes"
          label={tfl("popularDishes")}
          placeholder={tfl("optional")}
          isDisabled={isDisabled}
        />
        <DetailTextarea
          form={form}
          name="key_ingredients"
          id="cuisine-key-ingredients"
          label={tfl("keyIngredients")}
          placeholder={tfl("optional")}
          isDisabled={isDisabled}
        />
        <DetailTextarea
          form={form}
          name="info"
          id="cuisine-info"
          label={tfl("info")}
          placeholder={tfl("optional")}
          isDisabled={isDisabled}
        />
        <DetailTextarea
          form={form}
          name="dimension"
          id="cuisine-dimension"
          label={tfl("dimension")}
          placeholder={tfl("optional")}
          isDisabled={isDisabled}
        />
      </div>
    </Card>
  );
}

function DetailTextarea({
  form,
  name,
  id,
  label,
  placeholder,
  isDisabled,
}: {
  readonly form: UseFormReturn<CuisineFormValues>;
  readonly name: FieldPath<CuisineFormValues>;
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly isDisabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea
        id={id}
        placeholder={placeholder}
        rows={3}
        disabled={isDisabled}
        maxLength={256}
        {...form.register(name)}
      />
    </Field>
  );
}
