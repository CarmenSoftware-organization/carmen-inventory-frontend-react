import { useWatch, type UseFormReturn, type Control } from "react-hook-form";
import { memo } from "react";
import { useTranslations } from "use-intl";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixQty,
} from "@/components/ui/input/input-suffix";
import { useQuantityFormatter } from "@/hooks/use-number-formatter";
import { useUnitDecimals } from "@/hooks/use-product-units";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked, WatchedProductUnit, QtyUnitPlain } from "./helpers";

export const RequestedCell = memo(function RequestedCell({
  control,
  form,
  index,
  isDisabled,
}: {
  control: Control<PrFormValues>;
  form: UseFormReturn<PrFormValues>;
  index: number;
  isDisabled: boolean;
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const qty = useWatch({ control, name: `items.${index}.requested_qty` });
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const isRowLocked = useIsRowLocked(control, index);
  // ยังไม่เลือกสินค้า → ปิด qty (กรอกจำนวนก่อนเลือกสินค้าไม่มีความหมาย) แสดง default 0
  const isFieldDisabled = isDisabled || isRowLocked || !productId;
  const unitId =
    useWatch({ control, name: `items.${index}.requested_unit_id` }) ?? "";
  // ทศนิยมที่กรอกได้มาจาก decimal_place ของหน่วยที่เลือก (master data)
  const decimals = useUnitDecimals(productId, unitId);
  // ตัวเดียวกับที่คุม input — โหมดอ่านจึงแสดงเท่าที่โหมดแก้พิมพ์ได้พอดี
  const formatQty = useQuantityFormatter(decimals);

  if (isFieldDisabled) {
    return (
      <QtyUnitPlain
        control={control}
        index={index}
        unitField="requested_unit_id"
        value={formatQty(productId ? (qty ?? 0) : 0)}
      />
    );
  }

  return (
    <InputSuffixField
      className="w-full"
      // errorMessage ไม่ใช่ error — boolean ได้แค่กรอบแดงเปล่า ๆ ส่วน string
      // ได้ไอคอนเตือน + tooltip บอกเหตุผลด้วย ซึ่งจำเป็นตั้งแต่มีกฎ "ขอ 0 ได้
      // ก็ต่อเมื่อมี FOC" เพราะทางแก้อยู่คนละคอลัมน์ ไม่มีทางเดาเองได้
      errorMessage={form.formState.errors.items?.[index]?.requested_qty?.message}
    >
      <InputSuffixQty
        decimals={decimals}
        placeholder={tfl("qty")}
        defaultValue={qty ?? undefined}
        {...form.register(`items.${index}.requested_qty`)}
        onChange={(e) => {
          const n = e.target.valueAsNumber;
          form.setValue(
            `items.${index}.requested_qty`,
            Number.isNaN(n) ? 0 : n,
            { shouldDirty: true, shouldValidate: true },
          );
        }}
      />
      <InputSuffixAddon>
        <WatchedProductUnit
          control={control}
          index={index}
          unitField="requested_unit_id"
          isDisabled={false}
          onExtraChange={(value) => {
            form.setValue(`items.${index}.foc_unit_id`, value);
            form.setValue(`items.${index}.approved_unit_id`, value);
          }}
        />
      </InputSuffixAddon>
    </InputSuffixField>
  );
});
