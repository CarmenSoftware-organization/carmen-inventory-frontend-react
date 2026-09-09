import { memo } from "react";
import { useWatch, type Control } from "react-hook-form";
import { InputSuffixPlain } from "@/components/ui/input/input-suffix";
import { useProductUnits, useUnitDecimals } from "@/hooks/use-product-units";
import { useQuantityFormatter } from "@/hooks/use-number-formatter";
import type { GrnFormValues } from "../grn-form-schema";
import type { GrnQtyField, GrnUnitField } from "./types";

/** ยอดรวม qty ของ group (sum ทุก location) + unit — โชว์ที่ product row เหมือน PO */
export const GroupQtySum = memo(function GroupQtySum({
  control,
  indices,
  qtyField,
  unitField,
}: {
  control: Control<GrnFormValues>;
  indices: number[];
  qtyField: GrnQtyField;
  unitField: GrnUnitField;
}) {
  "use no memo";
  const qtys = useWatch({
    control,
    name: indices.map((i) => `items.${i}.${qtyField}` as const),
  });
  const total = (qtys ?? []).reduce((a, n) => a + (Number(n) || 0), 0);
  const primary = indices[0];
  const productId =
    useWatch({ control, name: `items.${primary}.product_id` }) ?? "";
  const unitId =
    useWatch({ control, name: `items.${primary}.${unitField}` }) ?? "";
  const { data: units = [] } = useProductUnits(productId || undefined);
  const unitName = units.find((u) => u.id === unitId)?.name ?? "";
  // ผลรวมของ float ต้อง format ก่อนออกจอเสมอ — 0.1 + 0.2 = 0.30000000000000004
  // ทศนิยมตาม decimal_place ของหน่วย ตัวเดียวกับที่คุมช่องกรอก
  const formatQty = useQuantityFormatter(useUnitDecimals(productId, unitId));
  return <InputSuffixPlain value={formatQty(total)} suffix={unitName} />;
});
