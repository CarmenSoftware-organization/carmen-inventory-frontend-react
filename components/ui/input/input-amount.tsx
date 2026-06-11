
import * as React from "react";

import { FieldInput } from "@/components/ui/field";
import { useProfile } from "@/hooks/use-profile";

type FieldInputProps = React.ComponentProps<typeof FieldInput>;
type InputAmountBaseProps = Omit<FieldInputProps, "type" | "step" | "inputMode">;

interface AmountInputProps extends InputAmountBaseProps {
  /** Override max decimal places (e.g. per-item currency decimals). Falls back to default currency from profile. */
  readonly decimals?: number;
}

/**
 * InputAmount — number input สำหรับจำนวนเงิน ใช้ FieldInput
 * - default decimals จาก `default_currency.decimal_places` (fallback 2)
 * - override ผ่าน prop `decimals` (เช่น per-item currency)
 * - กันพิมพ์ทศนิยมเกิน `resolvedDecimals` ผ่าน onChange interceptor
 * - รองรับ `error` + `errorIconAlign` ส่งผ่านไปยัง FieldInput
 */
export function InputAmount({
  decimals,
  placeholder,
  onChange,
  ...props
}: AmountInputProps) {
  const { defaultBu } = useProfile();
  const resolvedDecimals =
    decimals ?? defaultBu?.config?.default_currency?.decimal_places ?? 2;

  const computedStep =
    resolvedDecimals > 0
      ? `0.${"0".repeat(Math.max(resolvedDecimals - 1, 0))}1`
      : "1";
  const computedPlaceholder =
    placeholder ??
    (resolvedDecimals > 0 ? `0.${"0".repeat(resolvedDecimals)}` : "0");

  return (
    <FieldInput
      type="number"
      inputMode="decimal"
      step={computedStep}
      placeholder={computedPlaceholder}
      {...props}
      onChange={(e) => {
        const val = e.currentTarget.value;
        const dot = val.indexOf(".");
        if (dot !== -1 && val.length - dot - 1 > resolvedDecimals) {
          e.currentTarget.value =
            resolvedDecimals > 0
              ? val.slice(0, dot + resolvedDecimals + 1)
              : val.slice(0, dot);
        }
        onChange?.(e);
      }}
    />
  );
}
