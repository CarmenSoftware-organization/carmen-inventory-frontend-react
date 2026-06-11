
import { useEffect, useRef } from "react";
import { useTranslations } from "use-intl";
import { Ruler } from "lucide-react";
import { useProductUnits, type ProductUnit } from "@/hooks/use-product-units";
import { LookupCombobox } from "./lookup-combobox";

interface LookupProductUnitProps {
  readonly productId: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (unit: ProductUnit) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly disableTooltip?: boolean;
  readonly error?: string;
  readonly readOnly?: boolean;
}

/**
 * Lookup Popover สำหรับเลือกหน่วยนับของสินค้ารายการใดรายการหนึ่ง (cascading จาก productId)
 *
 * ดึงข้อมูลผ่าน `useProductUnits(productId)` ซึ่งคืนเฉพาะหน่วยที่สินค้าชิ้นนั้นรองรับ
 * (inventory/order/ingredient units) auto-select หน่วยแรกเมื่อ value ไม่ match หรือยังว่าง
 * disabled เมื่อไม่มี `productId` มี `onItemChange` ส่ง object `ProductUnit` เต็มสำหรับ side effects
 *
 * @param value - product unit id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX popover element ของ product unit lookup
 * @example
 * ```tsx
 * const productId = useWatch({ control, name: "product_id" });
 * <Controller name="unit_id" control={control} render={({ field }) => (
 *   <LookupProductUnit productId={productId} value={field.value} onValueChange={field.onChange} />
 * )} />
 * ```
 */
export function LookupProductUnit({
  productId,
  value,
  onValueChange,
  onItemChange,
  disabled,
  placeholder,
  className,
  disableTooltip,
  error,
  readOnly,
}: LookupProductUnitProps) {
  const tl = useTranslations("lookup");
  const tfl = useTranslations("field");
  const { data: units = [], isLoading } = useProductUnits(
    productId || undefined,
  );

  const onValueChangeRef = useRef(onValueChange);
  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  });
  useEffect(() => {
    if (units.length === 0) return;
    const hasMatch = units.some((u) => u.id === value);
    if (value && hasMatch) return;
    onValueChangeRef.current(units[0].id);
  }, [units, value]);

  return (
    <LookupCombobox
      value={value}
      onValueChange={(id, item) => {
        onValueChange(id);
        if (item) onItemChange?.(item);
      }}
      items={units}
      getId={(u) => u.id}
      getLabel={(u) => u.name}
      placeholder={placeholder ?? tl("select", { entity: tfl("unit") })}
      searchPlaceholder={tl("search", { entity: tfl("unit") })}
      disabled={disabled || !productId}
      isLoading={isLoading}
      className={className}
      emptyIcon={Ruler}
      emptyTitle={tl("noFound", { entity: tfl("unit") })}
      emptyDescription={tl("noFoundDesc")}
      disableTooltip={disableTooltip}
      error={error}
      readOnly={readOnly}
    />
  );
}
