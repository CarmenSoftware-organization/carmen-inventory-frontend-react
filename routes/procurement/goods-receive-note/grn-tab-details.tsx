"use no memo";

import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslations } from "use-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import type { GrnFormValues } from "./grn-form-schema";

interface GrnTabDetailsProps {
  readonly form: UseFormReturn<GrnFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly groupIndices: number[];
}

/**
 * แท็บ Details ของ GrnItemDetailSheet
 * แสดง/แก้ไข product, location, description
 * กรณี GRN มาจาก PO จะไม่ให้เปลี่ยน product; manual จะแก้ไขได้
 * location รองรับ exclude ซ้ำภายใน group เดียวกัน
 *
 * @param props - props
 * @param props.form - UseFormReturn ของ GrnFormValues
 * @param props.index - ลำดับ item ปัจจุบัน
 * @param props.disabled - ปิดการแก้ไข
 * @param props.groupIndices - index ทุก location ของ product เดียวกัน
 * @returns React element ของแท็บ
 * @example
 * <GrnTabDetails form={form} index={itemIndex} disabled={isView} groupIndices={groupIndices} />
 */
export default function GrnTabDetails({
  form,
  index,
  disabled,
  groupIndices,
}: GrnTabDetailsProps) {
  const tfl = useTranslations("field");
  const productId =
    useWatch({ control: form.control, name: `items.${index}.product_id` }) ??
    "";
  const docType =
    useWatch({ control: form.control, name: "doc_type" }) ?? "";
  const poNumber =
    useWatch({
      control: form.control,
      name: `items.${index}.purchase_order_no`,
    }) ?? "";
  const locationName =
    useWatch({
      control: form.control,
      name: `items.${index}.location_name`,
    }) ?? "";
  const isPo = docType !== "manual";

  // Sibling location IDs to exclude — reactive ผ่าน useWatch
  const siblingLocationIds = useWatch({
    control: form.control,
    name: groupIndices
      .filter((i) => i !== index)
      .map((i) => `items.${i}.location_id` as const),
  });
  const excludeLocationIds = (siblingLocationIds ?? []).filter(
    (v): v is string => !!v,
  );

  return (
    <div className="space-y-4 pt-4">
      {/* Product & Location */}
      <div className="space-y-3">
        <Field>
          <FieldLabel htmlFor={`items-${index}-product`} required className="text-xs">
            {tfl("product")}
          </FieldLabel>
          <Controller
            control={form.control}
            name={`items.${index}.product_id`}
            render={({ field, fieldState }) => (
              <LookupProduct
                value={field.value ?? ""}
                onValueChange={(value, product) => {
                  field.onChange(value);
                  if (product) {
                    form.setValue(`items.${index}.product_name`, product.name);
                  }
                  form.setValue(`items.${index}.received_unit_id`, null);
                  form.setValue(`items.${index}.foc_unit_id`, null);
                  form.setValue(`items.${index}.approved_unit_id`, null);
                }}
                disabled={disabled || isPo}
                className="text-xs"
                error={fieldState.error?.message}
              />
            )}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={`items-${index}-location`} required className="text-xs">
            {tfl("location")}
          </FieldLabel>
          <Controller
            control={form.control}
            name={`items.${index}.location_id`}
            render={({ field, fieldState }) => (
              <LookupProductLocation
                productId={productId}
                value={field.value ?? ""}
                onValueChange={field.onChange}
                onItemChange={(location) => {
                  form.setValue(`items.${index}.location_name`, location.name);
                }}
                defaultLabel={locationName || undefined}
                excludeIds={excludeLocationIds}
                disabled={disabled || isPo || !productId}
                className="w-full text-xs"
                modal
                error={fieldState.error?.message}
              />
            )}
          />
        </Field>
      </div>

      {/* PO Reference */}
      {isPo && (
        <div className="bg-muted/40 flex items-center justify-between rounded-md px-3 py-2">
          <span className="text-muted-foreground text-xs">{tfl("poNo")}</span>
          <span className="text-xs font-semibold">{poNumber || "—"}</span>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-3 border-t pt-3">
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
