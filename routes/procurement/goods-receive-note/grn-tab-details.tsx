import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { GrnFormValues } from "./grn-form-schema";

interface GrnTabDetailsProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
}

/**
 * ส่วน Details ของ expanded item row — PO reference + description + note
 * (location ย้ายไปเป็น inline row บนสุดของ expanded editor แล้ว)
 *
 * @param props - props
 * @param props.form - UseFormReturn ของ GrnFormValues
 * @param props.index - ลำดับ item ปัจจุบัน
 * @param props.disabled - ปิดการแก้ไข
 * @returns React element ของ section
 */
export default function GrnTabDetails({
  form,
  index,
  disabled,
}: GrnTabDetailsProps) {
  "use no memo";
  const tfl = useTranslations("field");
  const docType = useWatch({ control: form.control, name: "doc_type" }) ?? "";
  const poNumber =
    useWatch({
      control: form.control,
      name: `items.${index}.purchase_order_no`,
    }) ?? "";
  const isPo = docType !== "manual";

  return (
    <div className="space-y-3">
      {/* PO reference — flat inline */}
      {isPo && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">{tfl("poNo")}</span>
          <span className="text-foreground text-xs font-medium">
            {poNumber || "—"}
          </span>
        </div>
      )}

      {/* Notes */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <Field>
          <FieldLabel htmlFor={`items-${index}-note`} className="text-xs">
            {tfl("note")}
          </FieldLabel>
          <Textarea
            id={`items-${index}-note`}
            maxLength={256}
            disabled={disabled}
            className="text-xs"
            {...form.register(`items.${index}.note`)}
          />
        </Field>
      </div>
    </div>
  );
}
