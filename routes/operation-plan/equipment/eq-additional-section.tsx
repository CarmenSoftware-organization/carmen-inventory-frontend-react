
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { StatusSwitch } from "@/components/ui/status-switch";
import { Textarea } from "@/components/ui/textarea";
import { SettingSection } from "@/components/ui/setting-section";
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
    <SettingSection
      plain
      title={t("additional")}
      description={t("additionalDesc")}
    >
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

        <Controller
          control={form.control}
          name="is_portable"
          render={({ field }) => (
            <StatusSwitch
              id="equipment-is-portable"
              label={t("portable")}
              description={t("portableDesc")}
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={isDisabled}
              hideBadge
            />
          )}
        />
      </FieldGroup>
    </SettingSection>
  );
}
