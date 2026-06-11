
import * as React from "react";

import { FieldInput } from "@/components/ui/field";
import { useProfile } from "@/hooks/use-profile";

type FieldInputProps = React.ComponentProps<typeof FieldInput>;
type InputQtyProps = Omit<FieldInputProps, "type" | "step" | "inputMode">;

/**
 * InputQty — number input สำหรับจำนวน (qty) ใช้ FieldInput
 * - รับ config `quantity_format` จาก business unit profile
 * - กันพิมพ์ทศนิยมเกิน `resolvedDecimals` ตำแหน่งผ่าน onChange interceptor
 * - รองรับ `error` + `errorIconAlign` ส่งผ่านไปยัง FieldInput
 */
export function InputQty({
  placeholder,
  onChange,
  ...props
}: InputQtyProps) {
  const { defaultBu } = useProfile();
  const resolvedDecimals =
    defaultBu?.config?.quantity_format?.minimumIntegerDigits ?? 3;

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
