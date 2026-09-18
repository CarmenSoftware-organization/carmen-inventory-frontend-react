import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { LookupUserLocation } from "@/components/lookup/lookup-user-location";
import type { GrnFormValues } from "../grn-form-schema";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";

/**
 * คลังของแถว
 *
 * **เลือกคลังก่อน แล้วรายการสินค้าค่อยกรองตามคลังนั้น** (ทรงเดียวกับ PR/PO)
 * ของเดิมกลับทาง: ใช้ `LookupProductLocation` ที่ต้องรู้สินค้าก่อน ช่องคลังจึงกด
 * ไม่ได้จนกว่าจะเลือกสินค้า ทั้งที่คลังเป็นคอลัมน์แรกของตาราง — คนกรอกเจอช่องแรก
 * เป็นสีเทาแล้วไม่รู้ว่าต้องไปทำอะไรก่อน
 *
 * เปลี่ยนคลังแล้วล้างสินค้าทิ้ง **เฉพาะแถวที่กรอกเอง** — สินค้าที่เลือกไว้อาจไม่มี
 * ในคลังใหม่ · แถวที่มาจากใบสั่งซื้อห้ามล้าง สินค้าถูกกำหนดมาจากใบนั้นแล้ว คนรับของ
 * แค่ระบุว่าจะรับเข้าคลังไหน
 */
export function LocationCell({
  form,
  index,
  disabled,
  isManual,
  onPicked,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  disabled: boolean;
  isManual: boolean;
  onPicked?: () => void;
}) {
  "use no memo";
  const [locationName, locationCode] = useWatch({
    control: form.control,
    name: [
      `items.${index}.location_name`,
      `items.${index}.location_code`,
    ] as const,
  });

  if (disabled) {
    return <NameWithSubtext primary={locationName} secondary={locationCode} />;
  }

  return (
    <Controller
      control={form.control}
      name={`items.${index}.location_id`}
      render={({ field, fieldState }) => (
        <LookupUserLocation
          value={field.value ?? ""}
          onValueChange={(value) => {
            if (isManual && value !== field.value) {
              form.setValue(`items.${index}.product_id`, null, {
                shouldDirty: true,
              });
              form.setValue(`items.${index}.product_name`, "");
              form.setValue(`items.${index}.product_local_name`, "");
            }
            field.onChange(value);
            if (value) onPicked?.();
          }}
          onItemChange={(location) => {
            form.setValue(`items.${index}.location_name`, location.name);
            form.setValue(`items.${index}.location_code`, location.code ?? "");
            form.setValue(
              `items.${index}.location_type`,
              location.location_type ?? "",
            );
          }}
          defaultLabel={locationName || undefined}
          popoverWidth="w-[26.25rem]"
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
