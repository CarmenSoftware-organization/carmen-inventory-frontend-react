import { useWatch, type UseFormReturn } from "react-hook-form";
import {
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "../cn-form-schema";
import type { CnCreditNoteType } from "../cn-item-compute";

/**
 * ยอดสุทธิของบรรทัด — `quantity_return` คิดมาจาก qty × price − ส่วนลด (อ่านอย่างเดียว)
 * `amount_discount` ยอดนี้คือตัวตั้งของใบ กรอกที่ช่องนี้ตรง ๆ
 */
export function NetCell({
  form,
  index,
  type,
  disabled,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
  disabled: boolean;
}) {
  "use no memo";
  const net = useWatch({
    control: form.control,
    name: `items.${index}.net_amount`,
  });

  if (type === "amount_discount" && !disabled) {
    // ต้อง > 0 (schema) — กรอบแดง + ไอคอนเตือนในช่อง เหมือนช่องจำนวนคืน
    return (
      <InputSuffixField
        className="w-full"
        errorMessage={form.formState.errors.items?.[index]?.net_amount?.message}
      >
        <InputSuffixInput
          id={`items-${index}-net-amount`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          placeholder="0.00"
          {...form.register(`items.${index}.net_amount`, {
            valueAsNumber: true,
          })}
        />
      </InputSuffixField>
    );
  }

  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(Number(net) || 0)}
    </span>
  );
}
