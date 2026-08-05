import * as React from "react";

import { InputGroupInput } from "@/components/ui/input-group";
import {
  capQtyDecimals,
  DEFAULT_QTY_DECIMALS,
  QTY_STEP,
} from "@/components/ui/input/qty-decimals";

type Props = Omit<
  React.ComponentProps<typeof InputGroupInput>,
  "type" | "step" | "inputMode"
> & {
  /** เพดานทศนิยม (default `DEFAULT_QTY_DECIMALS`; ส่ง `useUnitDecimals(...)` เข้ามาเพื่อใช้ค่าจริงของหน่วย) */
  readonly decimals?: number;
};

/**
 * InputGroupQty — เวอร์ชัน InputGroup ของ `InputQty`
 *
 * ใช้เมื่อ qty ต้องอยู่ในกล่อง InputGroup เดียวกับ addon (เช่นหน่วยนับ) — render
 * เป็น InputGroupInput (borderless, data-slot=input-group-control) แทน FieldInput
 * ที่มี wrapper div ของตัวเอง · กติกาทศนิยมใช้ร่วมกันที่ `qty-decimals`
 */
export function InputGroupQty({
  decimals = DEFAULT_QTY_DECIMALS,
  onChange,
  ...props
}: Props) {
  return (
    <InputGroupInput
      type="number"
      inputMode="decimal"
      step={QTY_STEP}
      placeholder="0"
      {...props}
      onChange={(e) => {
        capQtyDecimals(e.currentTarget, decimals);
        onChange?.(e);
      }}
    />
  );
}
