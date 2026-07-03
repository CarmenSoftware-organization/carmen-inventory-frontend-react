import type { UseFormReturn, FieldArrayWithId } from "react-hook-form";
import type { CnFormValues } from "./cn-form-schema";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "use-intl";

export type CnItemField = FieldArrayWithId<CnFormValues, "items", "id">;

interface CnItemExpandedProps {
  readonly item: CnItemField;
  readonly form: UseFormReturn<CnFormValues>;
  readonly itemFields: CnItemField[];
  readonly disabled: boolean;
  /** % ของความกว้าง table ที่ต้อง indent ให้ตรงขอบซ้าย column Product */
  readonly leftInsetPct: number;
}

/** เนื้อหาแถวที่ expand ของ CN item — Details (price/tax/subtotal ย้ายเป็นคอลัมน์แล้ว) */
export function CnItemExpanded({
  item,
  form,
  itemFields,
  disabled,
  leftInsetPct,
}: CnItemExpandedProps) {
  const tfl = useTranslations("field");
  const index = Math.max(
    itemFields.findIndex((f) => f.id === item.id),
    0,
  );
  return (
    // w-0 min-w-full → เนื้อหา expand กว้างเท่า table (ไม่ดัน column ให้ยืด)
    // paddingLeft = % ให้ตรงขอบ column Product + 0.75rem (px-3 ของ cell) ให้ตรงตัวอักษร
    <div
      className="w-0 min-w-full space-y-4 overflow-x-auto py-3 pr-4"
      style={{ paddingLeft: `calc(${leftInsetPct}% + 0.75rem)` }}
    >
      <Field>
        <FieldLabel htmlFor={`items-${index}-description`} className="text-xs">
          {tfl("description")}
        </FieldLabel>
        {disabled ? (
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
    </div>
  );
}
