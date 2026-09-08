import {
  useFormState,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixPlain,
} from "@/components/ui/input/input-suffix";
import { cn } from "@/lib/utils";
import type { PoFormValues } from "../po-form-schema";
import { WatchedProductUnit } from "./unit-cell";

/**
 * Merged qty + order unit (Receiving-style) — qty ระดับ item เป็น read-only
 * sum ของ locations.order_qty; unit (order_unit_id) แก้ได้ใน addon
 */
export const QtyUnitCell = function QtyUnitCell({
  control,
  form,
  index,
  disabled,
  readOnly = false,
}: {
  control: Control<PoFormValues>;
  form: UseFormReturn<PoFormValues>;
  index: number;
  disabled: boolean;
  readOnly?: boolean;
}) {
  "use no memo";
  const locations =
    useWatch({ control, name: `items.${index}.locations` }) ?? [];
  const sum = locations.reduce(
    (acc, l) => acc + (Number(l?.order_qty) || 0),
    0,
  );
  // order_qty ระดับ item = ยอดรวมจาก locations (read-only) — ถ้ายอดรวมไม่ผ่าน
  // min qty จะไม่มี input ให้ scroll หา → mark data-invalid + สีแดงที่เซลล์นี้
  // ให้ scrollToFirstInvalidField เจอ + user เห็น field ที่ผิด
  const { errors } = useFormState({
    control,
    name: `items.${index}.order_qty`,
  });
  const invalid = !!errors.items?.[index]?.order_qty;

  if (disabled || readOnly) {
    const unitName = form.getValues(`items.${index}.order_unit_name`) ?? "";
    return (
      <InputSuffixPlain className="w-full" value={sum} suffix={unitName} />
    );
  }

  return (
    <InputSuffixField className="w-full" error={invalid}>
      <span
        data-invalid={invalid ? "true" : undefined}
        className={cn(
          "min-w-0 flex-1 px-2 text-right text-xs tabular-nums",
          invalid && "text-destructive font-semibold",
        )}
      >
        {sum}
      </span>
      <InputSuffixAddon>
        <WatchedProductUnit
          control={control}
          form={form}
          index={index}
          disabled={disabled}
        />
      </InputSuffixAddon>
    </InputSuffixField>
  );
};

/** Product-row summary: ผลรวม order_qty ของทุก location + unit (read-only) */

/** Product-row summary: ผลรวม order_qty ของทุก location + unit (read-only) */
export const OrderSummaryCell = function OrderSummaryCell({
  control,
  index,
}: {
  control: Control<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const locations =
    useWatch({ control, name: `items.${index}.locations` }) ?? [];
  const unitName =
    useWatch({ control, name: `items.${index}.order_unit_name` }) ?? "";
  const sum = locations.reduce((a, l) => a + (Number(l?.order_qty) || 0), 0);
  return (
    <InputSuffixPlain
      className="block w-full text-right"
      value={sum}
      suffix={unitName}
    />
  );
};

/** Product-row summary: ผลรวม received_qty ของทุก location + unit (read-only) */

/** Product-row summary: ผลรวม received_qty ของทุก location + unit (read-only) */
export const RecSummaryCell = function RecSummaryCell({
  control,
  index,
}: {
  control: Control<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const locations =
    useWatch({ control, name: `items.${index}.locations` }) ?? [];
  const unitName =
    useWatch({ control, name: `items.${index}.order_unit_name` }) ?? "";
  const sum = locations.reduce((a, l) => a + (Number(l?.received_qty) || 0), 0);
  return (
    <InputSuffixPlain
      className="block w-full text-right"
      value={sum}
      suffix={unitName}
    />
  );
};

/** Read-only display ของ sub/disc/net/tax/total — คำนวณ local เพื่อแสดงผล (ไม่เขียน form) */
