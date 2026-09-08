import { useWatch, type UseFormReturn } from "react-hook-form";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixPlain,
  InputSuffixQty,
} from "@/components/ui/input/input-suffix";
import { useUnitDecimals } from "@/hooks/use-product-units";
import type { CnFormValues } from "../cn-form-schema";

/** Return qty (+unit) — จำนวนที่คืน = ตัวตั้งของทุกยอดในแถว · amount_discount ล็อก (ref) */
export function QtyCell({
  form,
  index,
  disabled,
  locked,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  disabled: boolean;
  locked: boolean;
}) {
  "use no memo";
  const quantity = useWatch({
    control: form.control,
    name: `items.${index}.quantity`,
  });
  const unitName =
    useWatch({ control: form.control, name: `items.${index}.unit_name` }) ?? "";
  const grnReceivedQty = useWatch({
    control: form.control,
    name: `items.${index}._grn_received_qty`,
  });
  const error = form.formState.errors.items?.[index]?.quantity?.message;
  const productId =
    useWatch({ control: form.control, name: `items.${index}.item_id` }) ?? "";
  const unitId =
    useWatch({ control: form.control, name: `items.${index}.unit_id` }) ?? "";
  // ทศนิยมที่กรอกได้มาจาก decimal_place ของหน่วยที่เลือก (master data)
  const decimals = useUnitDecimals(productId, unitId);
  if (disabled || locked) {
    return (
      <InputSuffixPlain
        className="w-full"
        value={String(quantity ?? 0)}
        suffix={unitName}
      />
    );
  }
  // คืนเกินจำนวนที่รับ = error จาก schema (บล็อกตอน save) — กรอบแดง + ไอคอนเตือน
  // ในช่อง hover อ่านข้อความได้ แบบเดียวกับช่องราคาของ GRN/PR
  return (
    <InputSuffixField className="w-full" errorMessage={error}>
      <InputSuffixQty
        decimals={decimals}
        id={`items-${index}-quantity`}
        min={0}
        max={grnReceivedQty ?? undefined}
        placeholder="0"
        {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
      />
      {unitName && (
        <InputSuffixAddon>
          <span className="text-muted-foreground px-2 text-xs">{unitName}</span>
        </InputSuffixAddon>
      )}
    </InputSuffixField>
  );
}
