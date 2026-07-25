
import { Controller, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel, FieldDatePicker } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "./eq-card-shell";
import type { EquipmentFormValues } from "./eq-form-schema";

interface EqMaintenanceSectionProps {
  readonly form: UseFormReturn<EquipmentFormValues>;
  readonly isDisabled: boolean;
}

/** Maintenance — schedule + last/next dates */
export function EqMaintenanceSection({
  form,
  isDisabled,
}: EqMaintenanceSectionProps) {
  const t = useTranslations("operationPlan.equipment");
  const tfl = useTranslations("field");
  const errors = form.formState.errors;

  return (
    <Card
      label={t("maintenance")}
      description={t("maintenanceDesc")}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t("lastMaintenanceDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="last_maintenance_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
                placeholder={tfl("pickDate")}
                className="h-8 w-full text-sm"
                error={errors.last_maintenance_date?.message}
              />
            )}
          />
        </Field>

        <Field>
          <FieldLabel>{t("nextMaintenanceDate")}</FieldLabel>
          <Controller
            control={form.control}
            name="next_maintenance_date"
            render={({ field }) => (
              <FieldDatePicker
                value={field.value}
                onValueChange={field.onChange}
                disabled={isDisabled}
                placeholder={tfl("pickDate")}
                className="h-8 w-full text-sm"
                error={errors.next_maintenance_date?.message}
              />
            )}
          />
        </Field>

      </div>

      <Field className="mt-3">
        <FieldLabel htmlFor="equipment-maintenance-schedule">
          {t("maintenanceSchedule")}
        </FieldLabel>
        <Textarea
          id="equipment-maintenance-schedule"
          placeholder={tfl("optional")}
          rows={2}
          disabled={isDisabled}
          maxLength={256}
          {...form.register("maintenance_schedule")}
        />
      </Field>
    </Card>
  );
}
