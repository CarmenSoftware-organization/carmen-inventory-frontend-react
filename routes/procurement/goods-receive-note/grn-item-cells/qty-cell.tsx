import { memo } from "react";
import {
  Controller,
  useFormState,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { useTranslations } from "use-intl";
import {
  InputSuffixAddon,
  InputSuffixField,
  InputSuffixPlain,
  InputSuffixQty,
} from "@/components/ui/input/input-suffix";
import { LookupProductUnit } from "@/components/lookup/lookup-product-unit";
import { useProductUnits, useUnitDecimals } from "@/hooks/use-product-units";
import type { GrnFormValues } from "../grn-form-schema";
import type { GrnQtyField, GrnUnitField } from "./types";

/** unit lookup (borderless) — ฝังในกล่อง qty เดียวกัน, sync ตาม product_id ของแถว */
const WatchedProductUnit = memo(function WatchedProductUnit({
  control,
  index,
  unitField,
}: {
  control: Control<GrnFormValues>;
  index: number;
  unitField: GrnUnitField;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  return (
    <Controller
      control={control}
      name={`items.${index}.${unitField}`}
      render={({ field }) => (
        <LookupProductUnit
          productId={productId}
          value={field.value ?? ""}
          onValueChange={field.onChange}
          disabled={!productId}
          className="h-full w-19 shrink-0 rounded-none border-0 bg-transparent px-2 text-xs shadow-none hover:bg-transparent focus-visible:ring-0"
        />
      )}
    />
  );
});

/** qty + unit เป็น plain text (view mode) — resolve ชื่อหน่วยจาก product units */
const QtyUnitPlain = memo(function QtyUnitPlain({
  control,
  index,
  qtyField,
  unitField,
}: {
  control: Control<GrnFormValues>;
  index: number;
  qtyField: GrnQtyField;
  unitField: GrnUnitField;
}) {
  "use no memo";
  const productId =
    useWatch({ control, name: `items.${index}.product_id` }) ?? "";
  const qty = useWatch({ control, name: `items.${index}.${qtyField}` });
  const unitId =
    useWatch({ control, name: `items.${index}.${unitField}` }) ?? "";
  const { data: units = [] } = useProductUnits(productId || undefined);
  const unitName = units.find((u) => u.id === unitId)?.name ?? "";
  return (
    <InputSuffixPlain
      className="block w-full text-right"
      value={Number(qty) || 0}
      suffix={unitName}
    />
  );
});

/**
 * เซลล์ qty + unit — input (ซ้าย) + unit lookup (ขวา) ในกล่องเดียว
 *
 * แก้ไม่ได้ = **ตัวหนังสือ ไม่ใช่ช่องกรอกสีเทา** (เกณฑ์เดียวกับทุกเซลล์ของ PO)
 * ช่องเทา ๆ ที่กดไม่ได้กินที่เท่าช่องจริงโดยไม่ให้อะไรกลับมา
 */
export function QtyUnitCell({
  form,
  index,
  qtyField,
  unitField,
  disabled,
  error,
  inputRef,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  qtyField: GrnQtyField;
  unitField: GrnUnitField;
  disabled: boolean;
  error?: string;
  /** ให้ caller โฟกัสช่องนี้ได้ — ต่อ ref ของ RHF ไม่ทับกัน */
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  "use no memo";
  const [productId, unitId] = useWatch({
    control: form.control,
    name: [`items.${index}.product_id`, `items.${index}.${unitField}`] as const,
  });
  // ทศนิยมที่กรอกได้ = ของหน่วยที่เลือกอยู่ ไม่ใช่ค่าคงที่ (kg กรอกเศษได้ EA ไม่ได้)
  const decimals = useUnitDecimals(productId ?? undefined, unitId ?? undefined);

  if (disabled) {
    return (
      <QtyUnitPlain
        control={form.control}
        index={index}
        qtyField={qtyField}
        unitField={unitField}
      />
    );
  }
  return (
    <InputSuffixField className="w-full" error={!!error}>
      <InputSuffixQty
        decimals={decimals}
        placeholder="0"
        {...(() => {
          const { ref, ...field } = form.register(
            `items.${index}.${qtyField}`,
            { valueAsNumber: true },
          );
          return {
            ...field,
            ref: (el: HTMLInputElement | null) => {
              ref(el);
              if (inputRef) inputRef.current = el;
            },
          };
        })()}
      />
      <InputSuffixAddon>
        <WatchedProductUnit
          control={form.control}
          index={index}
          unitField={unitField}
        />
      </InputSuffixAddon>
    </InputSuffixField>
  );
}

/**
 * เตือน (ไม่ block) เมื่อรับเกินจำนวนสั่งของ PO — เทียบได้เฉพาะตอนหน่วยรับ
 * ตรงกับหน่วยสั่ง (คนละหน่วยเทียบตรง ๆ ไม่ได้ ปล่อยให้ backend ตัดสินตอน commit)
 */
export const OverReceiptWarning = memo(function OverReceiptWarning({
  control,
  index,
}: {
  control: Control<GrnFormValues>;
  index: number;
}) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const [poDetailId, approvedQty, approvedUnitId, receivedQty, receivedUnitId] =
    useWatch({
      control,
      name: [
        `items.${index}.purchase_order_detail_id`,
        `items.${index}.approved_qty`,
        `items.${index}.approved_unit_id`,
        `items.${index}.received_qty`,
        `items.${index}.received_unit_id`,
      ] as const,
    });

  const ordered = Number(approvedQty) || 0;
  const received = Number(receivedQty) || 0;
  const comparable =
    !!poDetailId && !!approvedUnitId && approvedUnitId === receivedUnitId;
  if (!comparable || ordered <= 0 || received <= ordered) return null;

  return (
    <p className="text-micro text-warning-ink mt-0.5 text-right">
      {t("overReceiptWarning", { ordered })}
    </p>
  );
});

/** จำนวนที่รับ + คำเตือนรับเกิน — แยกเป็นคอมโพเนนต์เพราะต้อง subscribe error ของแถว */
export function ReceivedQtyCell({
  form,
  index,
  disabled,
  inputRef,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  "use no memo";
  // subscribe เฉพาะ error ของแถวนี้ — อ่าน form.formState.errors ตรง ๆ ไม่ทำให้
  // เซลล์ re-render เมื่อ validation เปลี่ยน (subscription เป็นของ useForm ข้างบน)
  const { errors } = useFormState({
    control: form.control,
    name: `items.${index}`,
  });
  const error = errors.items?.[index]?.received_qty?.message;
  return (
    <>
      <QtyUnitCell
        form={form}
        index={index}
        qtyField="received_qty"
        unitField="received_unit_id"
        disabled={disabled}
        error={error}
        inputRef={inputRef}
      />
      {!disabled && <OverReceiptWarning control={form.control} index={index} />}
    </>
  );
}
