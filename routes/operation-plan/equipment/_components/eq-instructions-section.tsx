
import type { UseFormReturn, FieldPath } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "./eq-card-shell";
import type { EquipmentFormValues } from "./eq-form-schema";

interface EqInstructionsSectionProps {
  readonly form: UseFormReturn<EquipmentFormValues>;
  readonly isDisabled: boolean;
}

/** Instructions — operation · safety · cleaning */
export function EqInstructionsSection({
  form,
  isDisabled,
}: EqInstructionsSectionProps) {
  const t = useTranslations("operationPlan.equipment");
  const tfl = useTranslations("field");

  return (
    <Card label={t("instructions")}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <InstructionTextarea
          form={form}
          name="operation_instructions"
          id="equipment-operation-instructions"
          label={t("operationInstructions")}
          placeholder={tfl("optional")}
          isDisabled={isDisabled}
        />
        <InstructionTextarea
          form={form}
          name="safety_notes"
          id="equipment-safety-notes"
          label={t("safetyNotes")}
          placeholder={tfl("optional")}
          isDisabled={isDisabled}
        />
        <InstructionTextarea
          form={form}
          name="cleaning_instructions"
          id="equipment-cleaning-instructions"
          label={t("cleaningInstructions")}
          placeholder={tfl("optional")}
          isDisabled={isDisabled}
        />
      </div>
    </Card>
  );
}

function InstructionTextarea({
  form,
  name,
  id,
  label,
  placeholder,
  isDisabled,
}: {
  readonly form: UseFormReturn<EquipmentFormValues>;
  readonly name: FieldPath<EquipmentFormValues>;
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
