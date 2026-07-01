import { memo } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldInput, FieldLabel } from "@/components/ui/field";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { cn } from "@/lib/utils";
import type { CnFormValues } from "./cn-form-schema";

/**
 * เซลล์เลือก product unit ที่ sync ตาม item_id ของ row
 * ใช้ใน CnTabQty สำหรับ return unit (unit_id)
 *
 * @param props - props
 * @param props.control - control ของ react-hook-form
 * @param props.form - UseFormReturn ของ CnFormValues
 * @param props.index - ลำดับ item
 * @param props.disabled - ปิดการเลือก
 * @returns React element ของ lookup unit
 * @example
 * <WatchedProductUnit control={form.control} form={form} index={idx} disabled={isView} />
 */
const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  form,
  index,
  disabled,
}: {
  control: Control<CnFormValues>;
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.item_id` }) ?? "";

  return (
    <Controller
      control={control}
      name={`items.${index}.unit_id`}
      render={({ field, fieldState }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            form.setValue(`items.${index}.unit_name`, unit?.name ?? "");
          }}
          disabled={disabled || !productId}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

interface CnTabQtyProps {
  readonly form: UseFormReturn<CnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
}

/**
 * ส่วน Quantity ของ expanded item row
 * ให้กรอก return quantity และเลือกหน่วย — CN มีเพียง qty เดียว
 *
 * @param props - props ของแท็บ
 * @param props.form - UseFormReturn ของ CnFormValues
 * @param props.index - ลำดับ item ที่แก้ไข
 * @param props.disabled - ปิดการแก้ไข
 * @returns React element ของแท็บ quantity
 * @example
 * <CnTabQty form={form} index={itemIndex} disabled={isView} />
 */
export default function CnTabQty({ form, index, disabled }: CnTabQtyProps) {
  "use no memo";
  const tfl = useTranslations("field");
  const quantityError =
    form.formState.errors.items?.[index]?.quantity?.message;

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Field className="gap-1">
        <FieldLabel
          htmlFor={`items-${index}-quantity`}
          required
          className="text-xs"
        >
          {tfl("quantity")}
        </FieldLabel>
        <FieldInput
          id={`items-${index}-quantity`}
          type="number"
          inputMode="decimal"
          min={1}
          placeholder="0"
          className={cn(
            "h-8 w-full text-right text-xs",
            quantityError && "pl-7",
          )}
          disabled={disabled}
          error={quantityError}
          errorIconAlign="left"
          {...form.register(`items.${index}.quantity`, {
            valueAsNumber: true,
          })}
        />
      </Field>

      <Field className="gap-1">
        <FieldLabel required className="text-xs">
          {tfl("unit")}
        </FieldLabel>
        <WatchedProductUnit
          control={form.control}
          form={form}
          index={index}
          disabled={disabled}
        />
      </Field>
    </div>
  );
}
