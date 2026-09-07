import { memo } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { InputAmount } from "@/components/ui/input/input-amount";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import { ProductCell, StatusCell } from "./po-item-table";
import type { PoFormValues } from "./po-form-schema";

interface CellProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

/**
 * ช่องราคาต่อหน่วยบนแถวสินค้า — ราคาเป็นของสินค้า คลังทุกใบใช้ราคาเดียวกัน
 *
 * **ต้องเป็น `Controller` + `InputAmount` เท่านั้น** (ท่าเดียวกับ GRN):
 * - `<input type="number">` อ่าน `valueAsNumber` เป็น NaN ระหว่างพิมพ์ "17."
 *   ยอดต่อบรรทัดเลยแกว่งและทศนิยมหายกลางคัน · `InputAmount` sanitize เอง
 *   คุมทศนิยมตามสกุลเงินของ BU และคง trailing zero
 * - `shouldValidate` ทุก keystroke ทำให้ validate ทั้งฟอร์มแล้ว cell ถูกสร้างใหม่
 *   จนโฟกัสหลุดกลางที่พิมพ์ — Controller คุม subscription ไว้ในตัวเอง
 *
 * **และห้ามมี `useWatch` ในตัวนี้** — ค่าที่โหมดอ่านต้องใช้อยู่ใน `PricePlain`
 * แยกไปแล้ว การ subscribe ที่นี่ทำให้ cell re-render ทุกตัวอักษรที่พิมพ์ ซึ่งพา
 * `InputAmount` (ถือ draft/focused เป็น state ภายใน) ไปด้วยจนโฟกัสหลุด — เป็น
 * บั๊กเดิมที่ GRN เคยเจอแล้วครั้งหนึ่ง
 */
/** ราคาในโหมดอ่าน — แยกเป็นคอมโพเนนต์ของตัวเองเพื่อกัน `useWatch` ไปโผล่ในโหมดแก้ */
const PricePlain = memo(function PricePlain({
  form,
  index,
}: {
  form: UseFormReturn<PoFormValues>;
  index: number;
}) {
  "use no memo";
  const price =
    useWatch({ control: form.control, name: `items.${index}.price` }) ?? 0;
  return <span className="tabular-nums">{formatCurrency(price)}</span>;
});

export const PriceCell = memo(function PriceCell({
  form,
  index,
  disabled,
  readOnly,
  onCommit,
}: CellProps & {
  /** กรอกราคาเสร็จ (Enter) — ไปเปิดตัวเลือกคลังต่อ */
  readonly onCommit?: () => void;
}) {
  "use no memo";
  if (disabled || readOnly) {
    return <PricePlain form={form} index={index} />;
  }
  return (
    <Controller
      control={form.control}
      name={`items.${index}.price`}
      render={({ field, fieldState }) => (
        <InputAmount
          // name ให้ `fieldFocusRef` หาช่องนี้เจอ — lookup สินค้าเด้งโฟกัสมาที่นี่
          // ต่อหลังเลือกสินค้าเสร็จ
          name={field.name}
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

interface ProductHeaderCellProps extends CellProps {
  readonly isFoc: boolean;
  readonly showStatusBadge: boolean;
  /** ผู้อนุมัติในโหมดแก้ไขล้างสถานะรายแถวกลับเป็นรอได้ */
  readonly canResetStatus?: boolean;
}

/**
 * Product cell — name (ProductCell) + FOC/Status badges + local name + code/SKU
 *
 * Font ของทุก line ใช้ inherit จาก parent (`text-xs` บน table) — ไม่ override
 */
export function ProductHeaderCell({
  form,
  index,
  disabled,
  readOnly,
  isFoc,
  showStatusBadge,
  canResetStatus,
}: ProductHeaderCellProps) {
  "use no memo";
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <ProductCell
            control={form.control}
            form={form}
            index={index}
            disabled={disabled}
            readOnly={readOnly}
          />
        </div>
        {isFoc && (
          <Badge variant="success-light" size="xs">
            FOC
          </Badge>
        )}
        {showStatusBadge && (
          <StatusCell
            control={form.control}
            form={form}
            index={index}
            canReset={canResetStatus}
          />
        )}
      </div>
    </div>
  );
}
