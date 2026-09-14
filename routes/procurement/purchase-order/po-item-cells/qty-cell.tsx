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
        suffixClassName="ml-1 inline-block w-[4ch] text-left"
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
      suffixClassName="ml-1 inline-block w-[4ch] text-left"
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
      suffixClassName="ml-1 inline-block w-[4ch] text-left"
    />
  );
};

/**
 * จำนวนแถม (FOC) + หน่วยของแถม
 *
 * หน่วยแยกจากหน่วยสั่งซื้อ (สั่งเป็นลัง แถมเป็นชิ้นได้) เหมือน PR/GRN · ยังไม่ได้
 * เลือกไว้ก็ยืมหน่วยสั่งซื้อมาโชว์ไปก่อน และ `mapItemToPayload` ก็ส่งหน่วยสั่งซื้อ
 * ขึ้นไปแทน — จำนวนแถมที่ไม่รู้ว่านับเป็นหน่วยอะไรคือข้อมูลที่ใช้ต่อไม่ได้
 */
export const FocQtyCell = function FocQtyCell({
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
  const qty = useWatch({ control, name: `items.${index}.foc_qty` }) ?? 0;
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const focUnitId =
    useWatch({ control, name: `items.${index}.foc_unit_id` }) ?? "";
  const focUnitName =
    useWatch({ control, name: `items.${index}.foc_unit_name` }) ?? "";
  const orderUnitId =
    useWatch({ control, name: `items.${index}.order_unit_id` }) ?? "";
  const orderUnitName =
    useWatch({ control, name: `items.${index}.order_unit_name` }) ?? "";
  const unitName = focUnitName || orderUnitName;
  // ทศนิยมตามหน่วยที่ของแถมใช้จริง ไม่ใช่หน่วยสั่งซื้อ — คนละหน่วยคนละความละเอียด
  const decimals = useUnitDecimals(productId, focUnitId || orderUnitId);
  const formatQty = useQuantityFormatter(decimals);
  const name = `items.${index}.foc_qty` as const;

  if (disabled || readOnly) {
    return (
      <InputSuffixPlain
        className="block w-full text-right"
        value={formatQty(Number(qty))}
        suffix={unitName}
        suffixClassName="ml-1 inline-block w-[4ch] text-left"
      />
    );
  }

  return (
    <InputSuffixField className="w-full">
      <InputSuffixQty
        decimals={decimals}
        placeholder="0"
        defaultValue={Number(qty)}
        {...form.register(name)}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          const next = Number.isNaN(n) ? 0 : n;
          form.setValue(name, next, {
            shouldDirty: true,
            shouldValidate: true,
          });
          // มีของแถมแล้ว = แถวนี้ไม่ต้องมีจำนวนสั่ง/ราคาอีก (ดู validateSubmitItems)
          // ขอบแดงที่ค้างจากการกดส่งรอบก่อนต้องหายทันทีที่กรอก ไม่ใช่รอกดส่งอีกรอบ
          // ถึงจะรู้ว่าหายแล้ว
          if (next > 0) {
            form.clearErrors([
              `items.${index}.order_qty`,
              `items.${index}.price`,
            ]);
          }
        }}
      />
      <InputSuffixAddon>
        <WatchedProductUnit
          control={control}
          form={form}
          index={index}
          disabled={disabled}
          unitField="foc"
        />
      </InputSuffixAddon>
    </InputSuffixField>
  );
};
