import type { UseFormReturn, FieldPath } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel, FieldInput } from "@/components/ui/field";
import { SettingSection } from "@/components/ui/setting-section";
import type { EquipmentFormValues } from "./eq-form-schema";

interface EqQuantitySectionProps {
  readonly form: UseFormReturn<EquipmentFormValues>;
  readonly isDisabled: boolean;
}

/** Quantity & settings — available · total · usage count · avg usage time */
export function EqQuantitySection({
  form,
  isDisabled,
}: EqQuantitySectionProps) {
  const t = useTranslations("operationPlan.equipment");
  const tfl = useTranslations("field");

  return (
    <SettingSection
      plain
      title={t("qtySettings")}
      description={t("qtySettingsDesc")}
    >
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumberField
          form={form}
          name="available_qty"
          id="equipment-available-qty"
          label={tfl("availableQty")}
          isDisabled={isDisabled}
        />
        <NumberField
          form={form}
          name="total_qty"
          id="equipment-total-qty"
          label={tfl("totalQty")}
          isDisabled={isDisabled}
        />
        <NumberField
          form={form}
          name="usage_count"
          id="equipment-usage-count"
          label={tfl("usageCount")}
          isDisabled={isDisabled}
        />
        <NumberField
          form={form}
          name="average_usage_time"
          id="equipment-average-usage-time"
          label={t("avgUsageTime")}
          isDisabled={isDisabled}
        />
      </div>
    </SettingSection>
  );
}

function NumberField({
  form,
  name,
  id,
  label,
  isDisabled,
}: {
  readonly form: UseFormReturn<EquipmentFormValues>;
  readonly name: FieldPath<EquipmentFormValues>;
  readonly id: string;
  readonly label: string;
  readonly isDisabled: boolean;
}) {
  const error = form.formState.errors[name as keyof EquipmentFormValues]
    ?.message as string | undefined;
  return (
    <Field>
      <FieldLabel htmlFor={id} className="w-full justify-end">
        {label}
      </FieldLabel>
      <FieldInput
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        className="h-8 text-right tabular-nums"
        disabled={isDisabled}
        error={error}
        errorIconAlign="left"
        {...form.register(name)}
      />
    </Field>
  );
}
