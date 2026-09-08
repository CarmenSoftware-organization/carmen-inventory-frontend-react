import { memo, useMemo } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { fieldFocusRef } from "@/lib/field-focus";
import type { PoFormValues } from "../po-form-schema";

/**
 * Read-only display ของชื่อสินค้า — watch แค่ 2 field (name, description)
 * ไม่แตะ `items` array ทั้งก้อน จึงไม่ re-render ตอน field อื่นเปลี่ยน
 */
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

/**
 * Editable product lookup — watch `items` ทั้งก้อนเพื่อสร้าง excludeIds
 * (กันเลือกสินค้าซ้ำ) เฉพาะตอนแก้ไขเท่านั้น
 */

/**
 * Editable product lookup — watch `items` ทั้งก้อนเพื่อสร้าง excludeIds
 * (กันเลือกสินค้าซ้ำ) เฉพาะตอนแก้ไขเท่านั้น
 */
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
  const allItems = useWatch({ control, name: "items" });
  const excludeIds = useMemo(
    () =>
      (allItems ?? [])
        .map((it, i) => (i === index ? null : it?.product_id))
        .filter((id): id is string => !!id),
    [allItems, index],
  );

  return (
    <Controller
      control={control}
      name={`items.${index}.product_id`}
      render={({ field, fieldState }) => (
        <LookupProduct
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
          excludeIds={excludeIds}
          // เลือกสินค้าเสร็จ → ไปช่องราคาต่อ (สินค้า → ราคา → คลัง → จำนวน)
          // ราคาแทรกกลางเพราะเป็นของสินค้า กรอกทีเดียวจบ ส่วนคลังกับจำนวนต้อง
          // กรอกซ้ำทุกแถว — ถามของที่ถามครั้งเดียวให้จบก่อนแล้วค่อยเข้าลูป
          nextFocusRef={fieldFocusRef(`items.${index}.price`)}
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
