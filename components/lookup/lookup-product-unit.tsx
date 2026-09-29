import { useEffect, useRef } from "react";
import { useTranslations } from "use-intl";
import { Loader2 } from "lucide-react";
import { useProductUnits, type ProductUnit } from "@/hooks/use-product-units";
import { cn } from "@/lib/utils";
import { FieldPlainText } from "@/components/ui/field";
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
  /**
   * ชื่อหน่วยของ `value` ที่รู้อยู่แล้วจากเอกสาร — ใช้แสดงเมื่อหน่วยที่บันทึกไว้
   * ไม่อยู่ในรายการหน่วยปัจจุบันของสินค้า (เช่น conversion ถูกลบไปทีหลัง)
   */
  readonly defaultLabel?: string;
}

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
  defaultLabel,
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
  // เติมหน่วยแรกให้เฉพาะ (ก) ช่องยังว่าง หรือ (ข) ผู้ใช้เพิ่งเปลี่ยนสินค้าแล้วหน่วยเดิม
  // ไม่ใช่หน่วยของสินค้าใหม่ — หน่วยที่บันทึกไว้แล้วแต่ไม่อยู่ในรายการปัจจุบัน
  // (conversion ถูกลบทีหลัง ฯลฯ) ต้องคงไว้ เดิมถูกเขียนทับด้วย units[0] เงียบ ๆ
  // ทันทีที่เปิดเอกสาร รวมถึงโหมดดู ทำให้ข้อมูลเปลี่ยนเมื่อกด Save โดยผู้ใช้ไม่รู้ตัว
  // · ref อัปเดตเฉพาะตอนได้รายการหน่วยของสินค้านั้นแล้ว ระหว่างโหลดจึงยังนับว่า
  // "เปลี่ยนสินค้า" อยู่
  const settledProductRef = useRef(productId);
  useEffect(() => {
    if (readOnly || units.length === 0) return;
    const productChanged = settledProductRef.current !== productId;
    settledProductRef.current = productId;
    if (units.some((u) => u.id === value)) return;
    if (!value || productChanged) onValueChangeRef.current(units[0].id);
  }, [units, value, productId, readOnly]);

  const hasMatch = units.some((u) => u.id === value);
  // หน่วยที่บันทึกไว้แต่ไม่อยู่ในรายการ — ใส่เป็นตัวเลือกเพิ่มให้ Select วาดชื่อได้
  const orphanLabel =
    value && !hasMatch && !isLoading ? defaultLabel : undefined;

  if (readOnly) {
    const selected = units.find((u) => u.id === value);
    return (
      <FieldPlainText className={className}>
        {selected?.name ?? defaultLabel}
      </FieldPlainText>
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
      disabled={disabled || isLoading}
    >
      <SelectTrigger
        size="sm"
        align="end"
        aria-invalid={!!error}
        className={cn("text-xs", className)}
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
        {orphanLabel && (
          <SelectItem value={value} className="text-right text-xs">
            {orphanLabel}
          </SelectItem>
        )}
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
