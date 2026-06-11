"use no memo";

import { memo } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldInput, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import type { GrnFormValues } from "./grn-form-schema";

// --- WatchedProductUnit (same pattern as PR) ---

type GrnUnitField = "approved_unit_id" | "received_unit_id" | "foc_unit_id";

/**
 * เซลล์เลือก product unit ที่ sync ตาม product_id ของ row
 * ใช้ใน GrnTabQty สำหรับ approved_unit, received_unit และ foc_unit
 *
 * @param props - props
 * @param props.control - control ของ react-hook-form
 * @param props.index - ลำดับ item
 * @param props.unitField - ชื่อ field ที่ต้องการผูก ("approved_unit_id"/"received_unit_id"/"foc_unit_id")
 * @param props.disabled - ปิดการเลือก
 * @returns React element ของ lookup unit
 * @example
 * <WatchedProductUnit control={form.control} index={idx} unitField="received_unit_id" disabled={isView} />
 */
const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  index,
  unitField,
  disabled,
}: {
  control: Control<GrnFormValues>;
  index: number;
  unitField: GrnUnitField;
  disabled: boolean;
}) {
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";

  return (
    <Controller
      control={control}
      name={`items.${index}.${unitField}`}
      render={({ field, fieldState }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={disabled || !productId}
          className="w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

// --- GrnTabQty ---

interface GrnTabQtyProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly docType: string;
}

/**
 * แท็บ Quantity ของ GrnItemDetailSheet
 * ให้กรอก approved_qty, received_qty, foc_qty และเลือกหน่วยของแต่ละค่า
 * กรณี GRN manual บาง field อาจ disable ตาม docType
 *
 * @param props - props ของแท็บ
 * @param props.form - UseFormReturn ของ GrnFormValues
 * @param props.index - ลำดับ item ที่แก้ไข
 * @param props.disabled - ปิดการแก้ไข
 * @param props.docType - ประเภทเอกสาร GRN (ตัวกำหนดการ enable fields)
 * @returns React element ของแท็บ quantity
 * @example
 * <GrnTabQty form={form} index={itemIndex} disabled={isView} docType={docType} />
 */
export default function GrnTabQty({
  form,
  index,
  disabled,
  docType,
}: GrnTabQtyProps) {
  const tfl = useTranslations("field");
  const isPo = docType !== "manual";
  const receivedQtyError =
    form.formState.errors.items?.[index]?.received_qty?.message;

  return (
    <div className="space-y-3 pt-4">
      {/* Order Qty + Unit: PO = disabled, Manual = hidden */}
      {isPo && (
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel
              htmlFor={`items-${index}-order-qty`}
              className="text-xs"
            >
              {tfl("orderQty")}
            </FieldLabel>
            <Input
              id={`items-${index}-order-qty`}
              type="number" inputMode="decimal"
              min={0}
              placeholder="0"
              className="text-right text-xs"
              disabled
              {...form.register(`items.${index}.approved_qty`, {
                valueAsNumber: true,
              })}
            />
          </Field>

          <Field>
            <FieldLabel className="text-xs">{tfl("orderUnit")}</FieldLabel>
            <WatchedProductUnit
              control={form.control}
              index={index}
              unitField="approved_unit_id"
              disabled
            />
          </Field>
        </div>
      )}

      {/* Received Qty + Unit */}
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel
            htmlFor={`items-${index}-received-qty`}
            required
            className="text-xs"
          >
            {tfl("receivedQty")}
          </FieldLabel>
          <FieldInput
            id={`items-${index}-received-qty`}
            type="number"
            inputMode="decimal"
            min={1}
            placeholder="0"
            className={`text-right text-xs ${receivedQtyError ? "pl-7" : ""}`}
            disabled={disabled}
            error={receivedQtyError}
            errorIconAlign="left"
            {...form.register(`items.${index}.received_qty`, {
              valueAsNumber: true,
            })}
          />
        </Field>

        <Field>
          <FieldLabel required className="text-xs">{tfl("receivedUnit")}</FieldLabel>
          <WatchedProductUnit
            control={form.control}
            index={index}
            unitField="received_unit_id"
            disabled={disabled}
          />
        </Field>
      </div>

      {/* FOC Qty + Unit */}
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor={`items-${index}-foc-qty`} className="text-xs">
            {tfl("focQty")}
          </FieldLabel>
          <Input
            id={`items-${index}-foc-qty`}
            type="number" inputMode="decimal"
            min={0}
            placeholder="0"
            className="text-right text-xs"
            disabled={disabled}
            {...form.register(`items.${index}.foc_qty`, {
              valueAsNumber: true,
            })}
          />
        </Field>

        <Field>
          <FieldLabel className="text-xs">{tfl("focUnit")}</FieldLabel>
          <WatchedProductUnit
            control={form.control}
            index={index}
            unitField="foc_unit_id"
            disabled={disabled}
          />
        </Field>
      </div>
    </div>
  );
}
