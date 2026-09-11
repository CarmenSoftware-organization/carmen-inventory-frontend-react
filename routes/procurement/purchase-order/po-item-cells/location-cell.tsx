import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { LookupUserLocation } from "@/components/lookup/lookup-user-location";
import { fieldFocusRef } from "@/lib/field-focus";
import type { PoFormValues } from "../po-form-schema";

/**
 * คลังของแถว — แถวหนึ่ง = คลังเดียว ตั้งแต่ backend เลิก group location
 *
 * **เลือกคลังก่อน แล้วรายการสินค้าค่อยกรองตามคลังนั้น** (ทรงเดียวกับ PR) ของเดิม
 * กลับทาง: เลือกสินค้าก่อนแล้วค่อยเลือกคลังที่สินค้านั้นมีอยู่ ผ่าน
 * `LookupProductLocation` — ซึ่งบังคับให้ต้องรู้สินค้าก่อน ทำให้ช่องคลังกดไม่ได้
 * จนกว่าจะเลือกสินค้า
 *
 * ล้างสินค้าเมื่อเปลี่ยนคลัง — สินค้าที่เลือกไว้อาจไม่มีในคลังใหม่ ปล่อยค้างไว้
 * คือส่งของที่คลังนั้นไม่มีเข้าไปในใบโดยไม่มีใครเห็น
 */
export function LocationCell({
  form,
  index,
  disabled,
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
}) {
  "use no memo";
  const control = form.control;
  const name = useWatch({ control, name: `items.${index}.location_name` });
  const code = useWatch({ control, name: `items.${index}.location_code` });

  if (disabled) {
    return <NameWithSubtext primary={name || "—"} secondary={code ?? ""} />;
  }

  return (
    <Controller
      control={control}
      name={`items.${index}.location_id`}
      render={({ field, fieldState }) => (
        <LookupUserLocation
          value={field.value ?? ""}
          onValueChange={(value) => {
            if (value !== field.value) {
              // เปลี่ยนคลัง = รายการสินค้าที่เลือกได้เปลี่ยนตาม ของเดิมจึงใช้ไม่ได้
              form.setValue(`items.${index}.product_id`, null);
              form.setValue(`items.${index}.product_code`, "");
              form.setValue(`items.${index}.product_name`, "");
              form.setValue(`items.${index}.product_local_name`, "");
              form.setValue(`items.${index}.product_sku`, "");
            }
            field.onChange(value);
          }}
          onItemChange={(location) => {
            // capture meta ของคลัง → ส่งใน payload (backend ต้องการชื่อ/รหัสด้วย)
            form.setValue(`items.${index}.location_code`, location.code ?? "");
            form.setValue(`items.${index}.location_name`, location.name ?? "");
            // คลังที่ไม่มีจุดส่งของต้องล้างของเดิมทิ้ง ไม่ใช่ปล่อยค้าง — ไม่งั้น
            // แถวนี้แบกจุดส่งของคลังก่อนหน้าไปกับใบโดยไม่มีใครเห็น (ทรงเดียวกับ PR)
            form.setValue(
              `items.${index}.delivery_point_id`,
              location.delivery_point?.id ?? null,
            );
            form.setValue(
              `items.${index}.delivery_point_name`,
              location.delivery_point?.name ?? "",
            );
          }}
          nextFocusRef={fieldFocusRef(`items.${index}.product_id`)}
          className="h-8 w-full text-xs"
          popoverWidth="w-[26.25rem]"
          defaultLabel={name ?? ""}
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
