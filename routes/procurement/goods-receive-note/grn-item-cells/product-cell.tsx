import { memo } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { LookupProductInLocation } from "@/components/lookup/lookup-product-in-location";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import type { GrnFormValues } from "../grn-form-schema";

/**
 * Product lookup ของแถวที่กรอกเอง — **รายการกรองตามคลังของแถว**
 *
 * ยังไม่เลือกคลัง = ยังไม่รู้ว่ารับสินค้าอะไรเข้าได้บ้าง ตัว lookup จึงกดไม่ได้เอง
 * (`LookupProductInLocation` disable ตัวเองเมื่อไม่มี locationId)
 */
const ManualProductCell = memo(function ManualProductCell({
  form,
  index,
  open,
  onOpenChange,
  onPicked,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPicked?: () => void;
}) {
  "use no memo";
  const [locationId, productName] = useWatch({
    control: form.control,
    name: [`items.${index}.location_id`, `items.${index}.product_name`] as const,
  });

  return (
    <Controller
      control={form.control}
      name={`items.${index}.product_id`}
      render={({ field, fieldState }) => (
        <LookupProductInLocation
          locationId={locationId ?? ""}
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            field.onChange(value);
            if (product) {
              form.setValue(`items.${index}.product_name`, product.name, {
                shouldDirty: true,
              });
              form.setValue(
                `items.${index}.product_local_name`,
                product.local_name ?? "",
              );
            }
            if (value) onPicked?.();
          }}
          // ชื่อที่บันทึกไว้กับใบ — ลิสต์ paginate 30 ตัว/หน้า สินค้าที่เลือกไว้
          // อาจอยู่หน้าอื่น ไม่ส่งไป = ช่องว่างเปล่าทั้งที่แถวมีสินค้าอยู่
          defaultLabel={productName || undefined}
          open={open}
          onOpenChange={onOpenChange}
          className="h-8 w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
});

/** Product cell — แถวที่กรอกเอง: lookup · แถวที่มาจาก PO: ชื่ออย่างเดียว */
export function ProductCell({
  form,
  index,
  isManual,
  disabled,
  open,
  onOpenChange,
  onPicked,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  /** แถวนี้ไม่ได้อ้าง PO — สินค้าเลือกเองได้ */
  isManual: boolean;
  disabled: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPicked: () => void;
}) {
  "use no memo";
  const productName =
    useWatch({ control: form.control, name: `items.${index}.product_name` }) ??
    "";
  const productLocalName =
    useWatch({
      control: form.control,
      name: `items.${index}.product_local_name`,
    }) ?? "";

  // แก้ไม่ได้ → ชื่อสินค้าเป็นตัวหนังสือ (เกณฑ์เดียวกับ PO) · แถวที่อ้าง PO ก็
  // เปลี่ยนสินค้าไม่ได้แม้ใบจะอยู่โหมดแก้ไข — สินค้าถูกกำหนดมาจากใบสั่งซื้อแล้ว
  if (isManual && !disabled) {
    // ชื่อท้องถิ่นโชว์ใต้ตัวเลือกด้วย — ของเดิมมีเฉพาะโหมดอ่าน พอกด Edit บรรทัด
    // ภาษาไทยหายไปทั้งคอลัมน์ ทั้งที่คนกรอกใช้ชื่อนั้นยืนยันว่าเลือกถูกตัว
    return (
      <div className="min-w-0">
        <ManualProductCell
          form={form}
          index={index}
          open={open}
          onOpenChange={onOpenChange}
          onPicked={onPicked}
        />
        {productLocalName && (
          <p
            className="text-muted-foreground text-micro-legal truncate py-0.5 leading-[normal]"
            title={productLocalName}
          >
            {productLocalName}
          </p>
        )}
      </div>
    );
  }
  return <NameWithSubtext primary={productName} secondary={productLocalName} />;
}
