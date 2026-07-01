import { type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { CnFormValues } from "./cn-form-schema";

interface CnTabDetailsProps {
  readonly form: UseFormReturn<CnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
}

/**
 * ส่วน Details ของ expanded item row (CN) — description อย่างเดียว
 *
 * @param props - props
 * @param props.form - UseFormReturn ของ CnFormValues
 * @param props.index - ลำดับ item ปัจจุบัน
 * @param props.disabled - ปิดการแก้ไข
 * @returns React element ของ section
 */
export default function CnTabDetails({
  form,
  index,
  disabled,
}: CnTabDetailsProps) {
  "use no memo";
  const tfl = useTranslations("field");

  return (
    <Field>
      <FieldLabel htmlFor={`items-${index}-description`} className="text-xs">
        {tfl("description")}
      </FieldLabel>
      <Textarea
        id={`items-${index}-description`}
        maxLength={256}
        disabled={disabled}
        className="text-xs"
        {...form.register(`items.${index}.description`)}
      />
    </Field>
  );
}
