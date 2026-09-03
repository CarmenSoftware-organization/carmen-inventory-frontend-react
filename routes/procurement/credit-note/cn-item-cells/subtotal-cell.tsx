import { useWatch, type UseFormReturn } from "react-hook-form";
import {
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import { formatCurrency } from "@/lib/currency-utils";
import type { CnFormValues } from "../cn-form-schema";
import type { CnCreditNoteType } from "../cn-item-compute";
import { useCnItemLine } from "./helpers";

/**
 * Subtotal / CN amount — ช่องเดียวกัน สลับความหมายตามประเภทใบ
 * `quantity_return` → subtotal = จำนวนคืน × ราคา (read-only)
 * `amount_discount` → กรอก "CN Amount" ตรง (เขียน net_amount)
 */
export function SubtotalCell({
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
  const line = useCnItemLine(form, index, type);

  if (type === "amount_discount") {
    if (disabled) {
      return (
        <span className="text-foreground text-xs font-semibold tabular-nums">
          {formatCurrency(Number(net) || 0)}
        </span>
      );
    }
    // ยอดลดหนี้ต้อง > 0 (schema) — กรอบแดง + ไอคอนเตือนในช่อง เหมือนช่องจำนวนคืน
    return (
      <InputSuffixField
        className="w-full"
        errorMessage={form.formState.errors.items?.[index]?.net_amount?.message}
      >
        <InputSuffixInput
          id={`items-${index}-cn-amount`}
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
      {formatCurrency(line.sub_total)}
    </span>
  );
}

/** ยอดรวมย่อยของฝั่งคืน (read-only) — qty × price หรือยอดที่กรอกเองแล้วแต่ประเภทใบ */
export function LineSubtotalText({
  form,
  index,
  type,
}: {
  form: UseFormReturn<CnFormValues>;
  index: number;
  type: CnCreditNoteType;
}) {
  "use no memo";
  const line = useCnItemLine(form, index, type);
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(line.sub_total)}
    </span>
  );
}
