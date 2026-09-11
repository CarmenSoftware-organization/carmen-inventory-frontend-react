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
  InputSuffixQty,
} from "@/components/ui/input/input-suffix";
import { useQuantityFormatter } from "@/hooks/use-number-formatter";
import { useUnitDecimals } from "@/hooks/use-product-units";
import type { PoFormValues } from "../po-form-schema";
import { WatchedProductUnit } from "./unit-cell";

/** decimal_place ของหน่วยสั่งซื้อในแถวนั้น — เซลล์ในไฟล์นี้ต้องการชุดเดียวกัน */
function useOrderUnitDecimals(control: Control<PoFormValues>, index: number) {
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const unitId =
    useWatch({ control, name: `items.${index}.order_unit_id` }) ?? "";
  return useUnitDecimals(productId, unitId);
}

/**
 * จำนวนสั่ง + หน่วย ในกล่องเดียว
 *
 * แถวหนึ่ง = คลังเดียว ตั้งแต่ backend เลิก group location — `order_qty` จึงเป็น
 * ค่าของแถวตรง ๆ **แก้ได้ที่นี่** ของเดิมเป็นผลรวม read-only ของ `locations[]`
 * แล้วต้องกางแถวออกไปแก้ในตารางย่อย
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
  const qty = useWatch({ control, name: `items.${index}.order_qty` }) ?? 0;
  const { errors } = useFormState({
    control,
    name: `items.${index}.order_qty`,
  });
  const invalid = !!errors.items?.[index]?.order_qty;
  const decimals = useOrderUnitDecimals(control, index);
  const formatQty = useQuantityFormatter(decimals);
  const name = `items.${index}.order_qty` as const;

  if (disabled || readOnly) {
    const unitName = form.getValues(`items.${index}.order_unit_name`) ?? "";
    return (
      <InputSuffixPlain
        className="w-full"
        value={formatQty(Number(qty))}
        suffix={unitName}
      />
    );
  }

  return (
    <InputSuffixField className="w-full" error={invalid}>
      <InputSuffixQty
        decimals={decimals}
        placeholder="0"
        defaultValue={Number(qty)}
        {...form.register(name)}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          form.setValue(name, Number.isNaN(n) ? 0 : n, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }}
      />
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

/** จำนวนสั่งของแถว (อ่านอย่างเดียว) + หน่วย */
export const OrderSummaryCell = function OrderSummaryCell({
  control,
  index,
}: {
  control: Control<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const qty = useWatch({ control, name: `items.${index}.order_qty` }) ?? 0;
  const unitName =
    useWatch({ control, name: `items.${index}.order_unit_name` }) ?? "";
  const formatQty = useQuantityFormatter(useOrderUnitDecimals(control, index));
  return (
    <InputSuffixPlain
      className="block w-full text-right"
      value={formatQty(Number(qty))}
      suffix={unitName}
    />
  );
};

/**
 * จำนวนที่รับแล้ว (อ่านอย่างเดียว)
 *
 * response ไม่มี `received_qty` บนแถว — มันอยู่ใน `pr_details[]` ราย PR ที่แถวนี้
 * อ้างถึง `getDefaultValues` รวมให้แล้วตอนโหลด (ดู po-form-schema)
 */
export const RecSummaryCell = function RecSummaryCell({
  control,
  index,
}: {
  control: Control<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const received =
    useWatch({ control, name: `items.${index}.received_qty` }) ?? 0;
  const unitName =
    useWatch({ control, name: `items.${index}.order_unit_name` }) ?? "";
  const formatQty = useQuantityFormatter(useOrderUnitDecimals(control, index));
  return (
    <InputSuffixPlain
      className="block w-full text-right"
      value={formatQty(Number(received))}
      suffix={unitName}
    />
  );
};
