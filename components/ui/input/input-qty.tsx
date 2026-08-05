import * as React from "react";

import { FieldInput } from "@/components/ui/field";
import {
  capQtyDecimals,
  DEFAULT_QTY_DECIMALS,
  QTY_STEP,
} from "@/components/ui/input/qty-decimals";

type FieldInputProps = React.ComponentProps<typeof FieldInput>;
type InputQtyProps = Omit<FieldInputProps, "type" | "step" | "inputMode"> & {
  /** เพดานทศนิยม (default `DEFAULT_QTY_DECIMALS`; ส่ง `useUnitDecimals(...)` เข้ามาเพื่อใช้ค่าจริงของหน่วย) */
  readonly decimals?: number;
};

/**
 * InputQty — number input สำหรับจำนวน (qty) ใช้ FieldInput
 *
 * ทศนิยมพิมพ์ได้ถึง `decimals` ตำแหน่ง (ของชั่ง/ตวงรับเป็นเศษได้) กติกาทั้งหมด
 * อยู่ที่ `qty-decimals` ที่ใช้ร่วมกับ `InputGroupQty` และ `InputSuffixQty`
 * รองรับ `error` + `errorIconAlign` ส่งผ่านไปยัง FieldInput
 */
export function InputQty({
  decimals = DEFAULT_QTY_DECIMALS,
  onChange,
  ...props
}: InputQtyProps) {
  return (
    <FieldInput
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
