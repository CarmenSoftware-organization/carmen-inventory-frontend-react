import { useEffect, useRef } from "react";
import { useTranslations } from "use-intl";
import { Loader2 } from "lucide-react";
import { useProductUnits, type ProductUnit } from "@/hooks/use-product-units";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LookupProductUnitProps {
  readonly productId: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onItemChange?: (unit: ProductUnit) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
  readonly error?: string;
  readonly readOnly?: boolean;
}

/**
 * Select สำหรับเลือกหน่วยนับของสินค้ารายการใดรายการหนึ่ง (cascading จาก productId)
 *
 * ดึงข้อมูลผ่าน `useProductUnits(productId)` ซึ่งคืนเฉพาะหน่วยที่สินค้าชิ้นนั้นรองรับ
 * (inventory/order/ingredient units) auto-select หน่วยแรกเมื่อ value ไม่ match หรือยังว่าง
 * disabled เมื่อไม่มี `productId` มี `onItemChange` ส่ง object `ProductUnit` เต็มสำหรับ side effects
 *
 * @param value - product unit id ที่เลือกอยู่
 * @param onValueChange - callback เมื่อเปลี่ยนค่า ส่งเฉพาะ id
 * @returns JSX select element ของ product unit lookup
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

  if (readOnly) {
    const selected = units.find((u) => u.id === value);
    return (
      <span
        className={cn(
          "inline-flex min-h-8 items-center text-xs",
          !selected && "text-muted-foreground",
          className,
        )}
      >
        {selected?.name ?? "—"}
      </span>
    );
  }

  return (
    <Select
      value={value || undefined}
      onValueChange={(id) => {
        onValueChange(id);
        const unit = units.find((u) => u.id === id);
        if (unit) onItemChange?.(unit);
      }}
      disabled={disabled || !productId || isLoading}
    >
      <SelectTrigger
        size="sm"
        align="end"
        aria-invalid={!!error}
        className={cn("text-xs", className, "w-fit")}
      >
        {isLoading ? (
          <Loader2 className="text-muted-foreground size-3.5 animate-spin" />
        ) : (
          <SelectValue
            placeholder={placeholder ?? tl("select", { entity: tfl("unit") })}
          />
        )}
      </SelectTrigger>
      <SelectContent>
        {units.map((unit) => (
          <SelectItem
            key={unit.id}
            value={unit.id}
            className="text-right text-xs"
          >
            {unit.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
