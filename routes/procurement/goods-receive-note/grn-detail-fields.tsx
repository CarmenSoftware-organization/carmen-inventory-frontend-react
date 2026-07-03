import { useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { GrnFormValues } from "./grn-form-schema";

interface GrnDetailFieldsProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  /** view mode → description/note แสดงเป็น plain text (เหมือน grn-form-header) */
  readonly plainText?: boolean;
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
export default function GrnDetailFields({
  form,
  index,
  disabled,
  plainText = false,
}: GrnDetailFieldsProps) {
  "use no memo";
  const tfl = useTranslations("field");

  // view mode → คู่ label↔value ชิด + label เงียบ (เหมือน grn-form-header)
  const viewFieldGap = plainText ? "gap-1" : undefined;
  const viewLabelClass = plainText
    ? "text-muted-foreground font-normal"
    : undefined;
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
        <Field className={viewFieldGap}>
          <FieldLabel
            htmlFor={`items-${index}-description`}
            className={cn("text-xs", viewLabelClass)}
          >
            {tfl("description")}
          </FieldLabel>
          {plainText ? (
            <p className="min-h-8 text-xs whitespace-pre-wrap">
              {form.getValues(`items.${index}.description`) || "—"}
            </p>
          ) : (
            <Textarea
              id={`items-${index}-description`}
              maxLength={256}
              disabled={disabled}
              className="text-xs"
              {...form.register(`items.${index}.description`)}
            />
          )}
        </Field>

        <Field className={viewFieldGap}>
          <FieldLabel
            htmlFor={`items-${index}-note`}
            className={cn("text-xs", viewLabelClass)}
          >
            {tfl("note")}
          </FieldLabel>
          {plainText ? (
            <p className="min-h-8 text-xs whitespace-pre-wrap">
              {form.getValues(`items.${index}.note`) || "—"}
            </p>
          ) : (
            <Textarea
              id={`items-${index}-note`}
              maxLength={256}
              disabled={disabled}
              className="text-xs"
              {...form.register(`items.${index}.note`)}
            />
          )}
        </Field>
      </div>
    </div>
  );
}
