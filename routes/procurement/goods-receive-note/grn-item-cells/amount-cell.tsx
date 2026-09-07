import { memo } from "react";
import { useWatch, type Control } from "react-hook-form";
import { formatCurrency } from "@/lib/currency-utils";
import type { GrnFormValues } from "../grn-form-schema";
import type { GrnAmountField } from "./types";

/** ยอดรวมเงินของ group (sum ทุก location, บวกหลาย field ได้) — โชว์ที่ product row เหมือน PO */
export const GroupAmountSum = memo(function GroupAmountSum({
  control,
  indices,
  fields,
}: {
  control: Control<GrnFormValues>;
  indices: number[];
  fields: GrnAmountField[];
}) {
  "use no memo";
  const vals = useWatch({
    control,
    name: indices.flatMap((i) => fields.map((f) => `items.${i}.${f}` as const)),
  });
  const total = (vals ?? []).reduce((a, n) => a + (Number(n) || 0), 0);
  return (
    <span className="text-foreground text-xs font-medium tabular-nums">
      {formatCurrency(total)}
    </span>
  );
});

/** Total (net + tax) รวมของกลุ่ม (sum total_price ทุก location) — คอลัมน์ Amount */
export const GroupTotalCell = memo(function GroupTotalCell({
  control,
  indices,
}: {
  control: Control<GrnFormValues>;
  indices: number[];
}) {
  "use no memo";
  const totals = useWatch({
    control,
    name: indices.map((i) => `items.${i}.total_price` as const),
  });
  const total = (totals ?? []).reduce((a, n) => a + (Number(n) || 0), 0);
  return (
    <span className="text-foreground text-xs font-semibold tabular-nums">
      {formatCurrency(total)}
    </span>
  );
});
