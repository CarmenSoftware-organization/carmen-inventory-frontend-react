import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import type { GrnFormValues } from "../grn-form-schema";

/**
 * คลังที่รับของของแถวนี้
 *
 * ตัวเลือกกรองตามสินค้าของแถว (`LookupProductLocation`) จึงกดไม่ได้จนกว่าจะเลือก
 * สินค้าก่อน — ทิศทางตรงข้ามกับ PO ที่เลือกคลังก่อนแล้วค่อยได้รายการสินค้า
 */
export function LocationCell({
  form,
  index,
  disabled,
  autoOpen,
  open,
  onOpenChange,
  nextFocusRef,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  /**
   * แก้คลังไม่ได้ — รวมทั้งกรณีทั้งใบล็อก และกรณีแถวนี้อ้าง PO (คลังมาจาก PO)
   * แยก gate ของคลังออกจากเนื้อหาอื่นแบบเดียวกับ `locationsDisabled` ของ PO
   */
  disabled: boolean;
  autoOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** เลือกคลังเสร็จแล้วพาเคอร์เซอร์ไปช่องนี้ต่อ */
  nextFocusRef?: React.RefObject<HTMLInputElement | null>;
}) {
  "use no memo";
  const [productId, locationName, locationCode] = useWatch({
    control: form.control,
    name: [
      `items.${index}.product_id`,
      `items.${index}.location_name`,
      `items.${index}.location_code`,
    ] as const,
  });

  if (disabled) {
    return (
      <p className="truncate text-xs font-medium">
        {locationName || "—"}
        {locationCode ? (
          <span className="text-muted-foreground"> · {locationCode}</span>
        ) : null}
      </p>
    );
  }

  return (
    <Controller
      control={form.control}
      name={`items.${index}.location_id`}
      render={({ field, fieldState }) => (
        <LookupProductLocation
          productId={productId ?? ""}
          value={field.value ?? ""}
          onValueChange={(value) => {
            field.onChange(value);
            if (value) onOpenChange?.(false);
          }}
          onItemChange={(location) => {
            form.setValue(`items.${index}.location_name`, location.name);
            form.setValue(`items.${index}.location_code`, location.code);
            form.setValue(
              `items.${index}.location_type`,
              location.location_type,
            );
          }}
          defaultLabel={locationName || undefined}
          disabled={!productId}
          defaultOpen={autoOpen}
          open={open}
          onOpenChange={onOpenChange}
          nextFocusRef={nextFocusRef}
          className="h-8 w-full text-xs"
          modal
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
