import { Controller, type UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { LookupProductLocation } from "@/components/lookup/lookup-product-location";
import { fieldFocusRef } from "@/lib/field-focus";
import type { PoFormValues } from "../po-form-schema";

/**
 * คลังของแถว — แถวหนึ่ง = คลังเดียว ตั้งแต่ backend เลิก group location
 *
 * ของเดิมช่องนี้อยู่ในตารางย่อยที่ต้องกางแถวออกก่อนถึงจะเห็น (`LocationsEditor`)
 * ตอนนี้เป็นคอลัมน์ปกติของตารางสินค้า ไม่มีแถวขยายอีกแล้ว
 */
export function LocationCell({
  form,
  index,
  productId,
  workflowId,
  disabled,
}: {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly productId: string;
  readonly workflowId: string;
  readonly disabled: boolean;
}) {
  "use no memo";
  const name = useWatch({
    control: form.control,
    name: `items.${index}.location_name`,
  });
  const code = useWatch({
    control: form.control,
    name: `items.${index}.location_code`,
  });

  if (disabled) {
    return <NameWithSubtext primary={name || "—"} secondary={code ?? ""} />;
  }

  return (
    <Controller
      control={form.control}
      name={`items.${index}.location_id`}
      render={({ field, fieldState }) => (
        <LookupProductLocation
          productId={productId}
          workflowId={workflowId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          onItemChange={(loc) => {
            // capture meta ของคลัง → ส่งใน payload (backend ต้องการชื่อ/รหัสด้วย)
            form.setValue(`items.${index}.location_code`, loc.code ?? "");
            form.setValue(`items.${index}.location_name`, loc.name ?? "");
          }}
          nextFocusRef={fieldFocusRef(`items.${index}.order_qty`)}
          className="w-full text-xs"
          error={fieldState.error?.message}
        />
      )}
    />
  );
}
