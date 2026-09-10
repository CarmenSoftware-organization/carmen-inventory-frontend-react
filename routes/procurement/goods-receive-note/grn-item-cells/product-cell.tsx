import { memo } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { LookupProduct } from "@/components/lookup/lookup-product";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import type { GrnFormValues } from "../grn-form-schema";

/** Product lookup ของแถวที่กรอกเอง — เลือกแล้วล้างคลังเก่าทิ้ง */
const ManualProductCell = memo(function ManualProductCell({
  form,
  index,
  defaultOpen,
  onPicked,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  defaultOpen?: boolean;
  onPicked?: () => void;
}) {
  "use no memo";
  return (
    <Controller
      control={form.control}
      name={`items.${index}.product_id`}
      render={({ field, fieldState }) => (
        <LookupProduct
          value={field.value ?? ""}
          onValueChange={(value, product) => {
            const changed = value !== field.value;
            field.onChange(value);
            if (product) {
              form.setValue(`items.${index}.product_name`, product.name, {
                shouldDirty: true,
              });
            }
            // คลังที่เลือกไว้ผูกกับสินค้าตัวเดิม (LookupProductLocation กรองตาม
            // สินค้า) เปลี่ยนสินค้าแล้วไม่ล้าง = แถวถือคลังที่สินค้าใหม่ไม่มี
            if (changed) {
              form.setValue(`items.${index}.location_id`, null, {
                shouldDirty: true,
              });
              form.setValue(`items.${index}.location_name`, "");
              form.setValue(`items.${index}.location_code`, "");
              form.setValue(`items.${index}.location_type`, "");
            }
            if (value) onPicked?.();
          }}
          defaultOpen={defaultOpen}
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
  autoOpen,
  onPicked,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  /** แถวนี้ไม่ได้อ้าง PO — สินค้าเลือกเองได้ */
  isManual: boolean;
  disabled: boolean;
  autoOpen: boolean;
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
    return (
      <ManualProductCell
        form={form}
        index={index}
        defaultOpen={autoOpen}
        onPicked={onPicked}
      />
    );
  }
  return <NameWithSubtext primary={productName} secondary={productLocalName} />;
}
