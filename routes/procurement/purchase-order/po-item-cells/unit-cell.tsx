import { memo } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import type { PoFormValues } from "../po-form-schema";

export const WatchedProductUnit = memo(function WatchedProductUnit({
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
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";

  if (disabled || readOnly) {
    const unitName = form.getValues(`items.${index}.order_unit_name`) ?? "";
    return <span className="text-xs">{unitName || "—"}</span>;
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.order_unit_id`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            form.setValue(`items.${index}.order_unit_name`, unit.name);
            form.setValue(
              `items.${index}.order_unit_conversion_factor`,
              unit.conversion,
            );
          }}
          disabled={disabled || !productId}
          className="h-full w-19 shrink-0 rounded-none border-0 bg-transparent px-2 text-xs shadow-none hover:bg-transparent focus-visible:ring-0"
        />
      )}
    />
  );
});

/**
 * คอลัมน์หน่วยสั่งซื้อของแถวสินค้า — เลือกได้ (โหมดอ่าน → ข้อความเปล่า)
 *
 * หน่วยเป็นของ "รายการสินค้า" ไม่ใช่ของแต่ละคลัง (ทุกคลังในรายการเดียวกันสั่งด้วย
 * หน่วยเดียวกัน) จึงอยู่ที่แถวสินค้าแถวเดียว · เปลี่ยนหน่วยแล้วต้องอัปเดตชื่อกับ
 * conversion factor ตามไปด้วย ไม่งั้นยอดฐานที่คำนวณจากตัวคูณจะเพี้ยน
 *
 * @param props.index - ลำดับรายการสินค้า
 * @returns JSX element ของช่องเลือกหน่วย
 */

/**
 * คอลัมน์หน่วยสั่งซื้อของแถวสินค้า — เลือกได้ (โหมดอ่าน → ข้อความเปล่า)
 *
 * หน่วยเป็นของ "รายการสินค้า" ไม่ใช่ของแต่ละคลัง (ทุกคลังในรายการเดียวกันสั่งด้วย
 * หน่วยเดียวกัน) จึงอยู่ที่แถวสินค้าแถวเดียว · เปลี่ยนหน่วยแล้วต้องอัปเดตชื่อกับ
 * conversion factor ตามไปด้วย ไม่งั้นยอดฐานที่คำนวณจากตัวคูณจะเพี้ยน
 *
 * @param props.index - ลำดับรายการสินค้า
 * @returns JSX element ของช่องเลือกหน่วย
 */
export const UnitCol = memo(function UnitCol({
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
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitName =
    useWatch({ control, name: `items.${index}.order_unit_name` }) ?? "";

  if (disabled || readOnly) {
    return <span className="text-xs">{unitName || "—"}</span>;
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.order_unit_id`}
      render={({ field, fieldState }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            form.setValue(`items.${index}.order_unit_name`, unit.name);
            form.setValue(
              `items.${index}.order_unit_conversion_factor`,
              unit.conversion,
            );
          }}
          disabled={disabled || !productId}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});
