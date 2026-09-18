import { memo } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { LookupProductInLocation } from "@/components/lookup/lookup-product-in-location";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import type { PoFormValues } from "../po-form-schema";

const ProductCellDisplay = memo(function ProductCellDisplay({
  control,
  index,
}: {
  control: Control<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";
  const productLocalName =
    useWatch({ control, name: `items.${index}.product_local_name` }) ?? "";
  return <NameWithSubtext primary={productName} secondary={productLocalName} />;
});

const ProductCellEditable = memo(function ProductCellEditable({
  control,
  form,
  index,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const workflowId = useWatch({ control, name: "workflow_id" }) ?? "";
  const productName =
    useWatch({ control, name: `items.${index}.product_name` }) ?? "";

  return (
    <Controller
      control={control}
      name={`items.${index}.product_id`}
      render={({ field, fieldState }) => (
        <LookupProductInLocation
          locationId={locationId}
          workflowId={workflowId}
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            field.onChange(value);
            if (product) {
              form.setValue(`items.${index}.product_name`, product.name);
              form.setValue(`items.${index}.description`, product.name);
              form.setValue(
                `items.${index}.product_local_name`,
                product.local_name ?? "",
              );
              form.setValue(`items.${index}.product_code`, product.code ?? "");
              form.setValue(
                `items.${index}.product_sku`,
                (product as unknown as { sku?: string }).sku ?? "",
              );
              form.setValue(
                `items.${index}.base_unit_id`,
                product.inventory_unit?.id ?? null,
              );
              form.setValue(
                `items.${index}.base_unit_name`,
                product.inventory_unit?.name ?? "",
              );
              form.setValue(
                `items.${index}.order_unit_id`,
                product.inventory_unit?.id ?? "",
              );
              form.setValue(
                `items.${index}.order_unit_name`,
                product.inventory_unit?.name ?? "",
              );
              form.setValue(`items.${index}.order_unit_conversion_factor`, 1);
            }
          }}
          defaultLabel={productName}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

export const ProductCell = function ProductCell({
  control,
  form,
  index,
  disabled,
  readOnly = false,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
  disabled: boolean;
  readOnly?: boolean;
}) {
  "use no memo";
  if (disabled || readOnly) {
    return <ProductCellDisplay control={control} index={index} />;
  }
  return <ProductCellEditable control={control} form={form} index={index} />;
};
