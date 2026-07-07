import * as React from "react";

import { InputGroupInput } from "@/components/ui/input-group";
import { useProfile } from "@/hooks/use-profile";

type Props = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "type" | "step" | "inputMode"
>;

/**
 * InputGroupQty — เวอร์ชัน InputGroup ของ InputQty (number input สำหรับจำนวน)
 *
 * ใช้เมื่อ qty ต้องอยู่ในกล่อง InputGroup เดียวกับ addon (เช่นหน่วยนับ) — render
 * เป็น InputGroupInput (borderless, data-slot=input-group-control) แทน FieldInput
 * ที่มี wrapper div ของตัวเอง. logic decimal เหมือน InputQty ทุกอย่าง:
 * - รับ config `quantity_format` จาก business unit profile
 * - กันพิมพ์ทศนิยมเกิน `resolvedDecimals` ตำแหน่งผ่าน onChange interceptor
 */
export function InputGroupQty({ placeholder, onChange, ...props }: Props) {
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
    <InputGroupInput
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
