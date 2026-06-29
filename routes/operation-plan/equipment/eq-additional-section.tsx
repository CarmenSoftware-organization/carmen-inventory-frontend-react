
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "./eq-card-shell";
import type { EquipmentFormValues } from "./eq-form-schema";

interface EqAdditionalSectionProps {
  readonly form: UseFormReturn<EquipmentFormValues>;
  readonly isDisabled: boolean;
}

/** Additional — note + active/portable toggles */
export function EqAdditionalSection({
  form,
  isDisabled,
}: EqAdditionalSectionProps) {
  const t = useTranslations("operationPlan.equipment");
  const tfl = useTranslations("field");

  return (
    <Card label={t("additional")}>
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor="equipment-note">{tfl("note")}</FieldLabel>
          <Textarea
            id="equipment-note"
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
              id="equipment-is-active"
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isDisabled}
            />
          )}
        />

        <Field orientation="horizontal">
          <Controller
            control={form.control}
            name="is_portable"
            render={({ field }) => (
              <Checkbox
                id="equipment-is-portable"
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isDisabled}
              />
            )}
          />
          <FieldLabel htmlFor="equipment-is-portable">
            {t("portable")}
          </FieldLabel>
        </Field>
      </FieldGroup>
    </Card>
  );
}
