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
 * Editable product lookup — รายการสินค้ากรองตาม **คลังของแถวนี้**
 * (`useProductsByLocation`) ต้องเลือกคลังก่อนถึงจะเลือกสินค้าได้ ทรงเดียวกับ PR
 * ของเดิมใช้ `LookupProduct` ที่ดึงสินค้าทั้งระบบ แล้วค่อยไปเลือกคลังที่สินค้านั้นมี
 *
 * **ไม่มี excludeIds** — สินค้าตัวเดียวกันซ้ำได้ (คนละราคา คนละกำหนดส่ง คนละแถว
 * ของ PR ที่อ้างถึง) ของเดิมกันซ้ำทั้งใบ ซึ่งไปปิดเคสที่ถูกต้อง · ผลพลอยได้คือ
 * เลิก watch `items` ทั้งก้อน ซึ่งเดิมทำให้ทุกแถว re-render ตอนพิมพ์ช่องใดช่องหนึ่ง
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
  const locationId =
    useWatch({ control, name: `items.${index}.location_id` }) ?? "";
  const workflowId = useWatch({ control, name: "workflow_id" }) ?? "";
  // ชื่อที่บันทึกไว้กับใบ — ใช้แสดงเมื่อหา id ในลิสต์ที่โหลดมาไม่เจอ ซึ่งเกิดเป็น
  // ปกติตอนเปิดใบเดิม (ลิสต์ paginate 30 ตัว/หน้า สินค้าที่เลือกไว้อาจอยู่หน้าอื่น)
  // ไม่ส่งไป = ช่องว่างเปล่าทั้งที่ใบมีสินค้าอยู่
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
          // ลำดับกรอกคือ คลัง → สินค้า → ราคา → จำนวน · คลังมาก่อนเพราะมันเป็นตัว
          // กำหนดว่าเลือกสินค้าอะไรได้บ้าง — LookupProductInLocation ไม่มี
          // nextFocusRef (ต่างจาก LookupProduct เดิม) การเด้งไปช่องราคาจึงหายไป
          // ตรงนี้ ไม่ได้ตั้งใจตัด
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
