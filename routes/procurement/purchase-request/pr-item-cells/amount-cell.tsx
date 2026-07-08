import { useWatch, type Control } from "react-hook-form";
import { memo, type ReactNode } from "react";
import { formatCurrency, round2 } from "@/lib/currency-utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { PrFormValues } from "../pr-form-schema";

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
  const isForeignCurrency =
    !!currencyCode && !!baseCurrencyCode && currencyCode !== baseCurrencyCode;
  const baseAmount = round2(Number(totalPrice) * Number(exchangeRate));
  const amountText = formatCurrency(Number(totalPrice));

  const baseLine = isForeignCurrency && (
    <span className="text-muted-foreground text-[0.6875rem] tabular-nums">
      {formatCurrency(baseAmount)} {baseCurrencyCode}
    </span>
  );

  // View/locked: ยอดคำนวณ read-only ไม่ควรดูเหมือนช่องกรอกได้ → แสดงเป็น text เดิม
  if (isDisabled) {
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
      <InputGroup className="h-7 w-full">
        <InputGroupInput
          readOnly
          tabIndex={-1}
          value={amountText}
          className="h-7 cursor-default text-right font-semibold tabular-nums"
        />
        <InputGroupAddon align="inline-end">{currencySlot}</InputGroupAddon>
      </InputGroup>
      {baseLine}
    </div>
  );
});
