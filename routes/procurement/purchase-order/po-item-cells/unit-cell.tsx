import { memo } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import type { PoFormValues } from "../po-form-schema";

/**
 * หน่วยที่ช่องกรอกอ้างถึง — หน่วยสั่งซื้อ (default) หรือหน่วยของแถม
 *
 * สองตัวนี้เป็นคนละหน่วยกันได้จริง (สั่งเป็นลัง แถมเป็นชิ้น) จึงเก็บแยกกันทั้งคู่
 * ต่างกันอีกอย่างคือ conversion factor มีเฉพาะหน่วยสั่งซื้อ เพราะยอดฐานคิดจาก
 * จำนวนที่สั่ง ไม่ใช่ของแถม
 */
export type PoUnitField = "order" | "foc";

export const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  form,
  index,
  disabled,
  readOnly = false,
  unitField = "order",
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
  disabled: boolean;
  readOnly?: boolean;
  unitField?: PoUnitField;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const idName =
    unitField === "foc"
      ? (`items.${index}.foc_unit_id` as const)
      : (`items.${index}.order_unit_id` as const);
  const nameName =
    unitField === "foc"
      ? (`items.${index}.foc_unit_name` as const)
      : (`items.${index}.order_unit_name` as const);

  if (disabled || readOnly) {
    const unitName = form.getValues(nameName) ?? "";
    return <span className="text-xs">{unitName || "—"}</span>;
  }

  return (
    <Controller
      control={control}
      name={idName}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(unit) => {
            form.setValue(nameName, unit.name);
            if (unitField === "order") {
              form.setValue(
                `items.${index}.order_unit_conversion_factor`,
                unit.conversion,
              );
            }
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
