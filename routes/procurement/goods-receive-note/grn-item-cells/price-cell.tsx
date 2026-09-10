import { memo, useEffect, useRef } from "react";
import {
  Controller,
  useWatch,
  type Control,
  type UseFormReturn,
} from "react-hook-form";
import { InputAmount } from "@/components/ui/input/input-amount";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { GrnFormValues } from "../grn-form-schema";

/** ราคาในโหมดอ่าน */
const UnitPricePlain = memo(function UnitPricePlain({
  control,
  index,
}: {
  control: Control<GrnFormValues>;
  index: number;
}) {
  "use no memo";
  const price = useWatch({ control, name: `items.${index}.unit_price` });
  return (
    <span className="text-foreground text-xs font-medium tabular-nums">
      {formatCurrency(Number(price) || 0)}
    </span>
  );
});

/**
 * ราคาต่อหน่วยของแถว
 *
 * **ต้องเป็น `Controller` เท่านั้น อย่าเปลี่ยนไปใช้ `useWatch` + `setValue`** —
 * ช่องกรอกนี้อยู่ใน cell ของ `DataGrid` เคยเขียนเป็น useWatch แล้วโฟกัสหลุดทันที
 * ที่พิมพ์ตัวแรก เพราะ cell ถูกสร้างใหม่แล้ว `InputAmount` ที่ถือ draft/focused
 * เป็น state ภายในโดน remount · Controller คุม subscription ไว้ในตัวเอง cell
 * จึงไม่ถูกกระตุ้นจากข้างนอก (เทสต์ jsdom จับเรื่องนี้ไม่ได้ — vitest ไม่ได้รัน
 * react-compiler ที่ vite.config เปิดไว้)
 *
 * ใช้ `InputAmount` (text input ที่ sanitize เอง) ไม่ใช่ `<input type="number">`:
 * ระหว่างพิมพ์ "17." เบราว์เซอร์อ่าน valueAsNumber เป็น NaN → ยอดต่อบรรทัดแกว่ง
 * และทศนิยมหายกลางคัน
 */
export const UnitPriceCell = memo(function UnitPriceCell({
  form,
  index,
  disabled,
  autoFocus,
  onCommit,
}: {
  form: UseFormReturn<GrnFormValues>;
  index: number;
  disabled: boolean;
  /** เพิ่งเลือกสินค้าเสร็จ — ให้เคอร์เซอร์มาลงที่ช่องนี้ต่อ */
  autoFocus?: boolean;
  /** กรอกราคาเสร็จ (Enter) — ไปเปิดตัวเลือกคลังต่อ */
  onCommit?: () => void;
}) {
  "use no memo";
  const ref = useRef<HTMLInputElement>(null);

  // autoFocus ของ React ทำงานตอน mount เท่านั้น แต่ cell ตัวนี้ mount ไปแล้ว
  // ตั้งแต่แถวเกิด จังหวะที่ต้องโฟกัสคือตอน "เพิ่งเลือกสินค้า" ซึ่งมาทีหลัง
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  if (disabled) {
    return <UnitPricePlain control={form.control} index={index} />;
  }

  return (
    <Controller
      control={form.control}
      name={`items.${index}.unit_price`}
      render={({ field, fieldState }) => (
        <InputAmount
          ref={ref}
          // ไอคอน error อยู่ซ้าย (ตัวเลขชิดขวา) — เว้นที่ให้ด้วย pl-7 ไม่งั้นทับเลข
          className={cn(
            "h-8 w-full text-right text-xs",
            fieldState.error && "pl-7",
          )}
          error={fieldState.error?.message}
          errorIconAlign="left"
          // Enter = กรอกเสร็จแล้ว ไปเลือกคลังต่อ · preventDefault กัน Enter ใน
          // ฟอร์มไปกด submit แทน (ทั้งใบยังกรอกไม่ครบด้วยซ้ำ)
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            onCommit?.();
          }}
          value={Number(field.value ?? 0)}
          onValueChange={field.onChange}
        />
      )}
    />
  );
});
