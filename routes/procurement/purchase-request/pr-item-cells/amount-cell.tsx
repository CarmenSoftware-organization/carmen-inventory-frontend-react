import { useWatch, type Control } from "react-hook-form";
import { memo, type ReactNode } from "react";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixInput,
} from "@/components/ui/input/input-suffix";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "./helpers";

export const AmountCell = memo(function AmountCell({
  control,
  index,
  baseCurrencyCode,
  currencySlot,
  isDisabled,
}: {
  control: Control<PrFormValues>;
  index: number;
  baseCurrencyCode?: string;
  /** currency control วางแนวนอนข้างยอด (บรรทัดเดียวกัน) */
  currencySlot?: ReactNode;
  isDisabled?: boolean;
}) {
  "use no memo";
  const totalPrice =
    useWatch({ control, name: `items.${index}.total_price` }) ?? 0;
  const exchangeRate =
    useWatch({ control, name: `items.${index}.exchange_rate` }) ?? 1;
  const currencyCode =
    useWatch({ control, name: `items.${index}.currency_code` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);
  const isForeignCurrency =
    !!currencyCode && !!baseCurrencyCode && currencyCode !== baseCurrencyCode;
  const baseAmount = round2(Number(totalPrice) * Number(exchangeRate));
  const amountText = formatCurrency(Number(totalPrice));

  // currency เลือกได้เมื่อฟอร์มยังแก้ได้และ row ไม่ถูก lock (ตรงกับ CurrencyCell)
  const currencySelectable = !isDisabled && !isRowLocked;

  const baseLine = isForeignCurrency && (
    <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
      {formatCurrency(baseAmount)} {baseCurrencyCode}
    </span>
  );

  // ยอดคำนวณ read-only เสมอ (กรอกไม่ได้). currency เลือกได้ → ใช้กล่อง InputSuffix
  // โดยยอดเป็น bg-muted (สื่อว่ากรอกไม่ได้) แต่ currencySlot ยังเลือกได้;
  // เลือกไม่ได้ → plain text ทั้งแถว
  if (!currencySelectable) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center justify-end gap-1.5">
          <span className="font-semibold tabular-nums">{amountText}</span>
          <span className="text-muted-foreground">{currencySlot}</span>
        </div>
        {baseLine}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <InputSuffixField className="w-full">
        <InputSuffixInput
          readOnly
          tabIndex={-1}
          value={amountText}
          className="bg-muted cursor-default font-semibold tabular-nums"
        />
        <InputSuffixAddon>{currencySlot}</InputSuffixAddon>
      </InputSuffixField>
      {baseLine}
    </div>
  );
});
