import * as React from "react";

import { FieldInput } from "@/components/ui/field";
import {
  capQtyDecimals,
  DEFAULT_QTY_DECIMALS,
  QTY_STEP,
} from "@/components/ui/input/qty-decimals";

type FieldInputProps = React.ComponentProps<typeof FieldInput>;
type InputQtyProps = Omit<FieldInputProps, "type" | "step" | "inputMode"> & {
  readonly decimals?: number;
};

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
