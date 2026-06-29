
import { Controller, useWatch, type Control } from "react-hook-form";
import { LookupUnit } from "@/components/lookup/lookup-unit";
import type { ProductFormValues } from "@/types/product";

type UnitArrayName = "order_units" | "ingredient_units";

interface UnitCellProps {
  readonly control: Control<ProductFormValues>;
  readonly name: UnitArrayName;
  readonly index: number;
  readonly isOrder: boolean;
  readonly inventoryUnitName: string;
  readonly disabled: boolean;
  readonly onUnitChange: (index: number, unitId: string) => void;
  readonly usedIds: string[];
  readonly unitMap: Map<string, string>;
  readonly error?: string;
}

/**
 * Cell แสดง/แก้ไขหน่วยต้นทาง (from_unit) สำหรับ order_units
 * โหมด ingredient_units จะแสดงชื่อ inventory unit อ่านอย่างเดียว
 * โหมด view (disabled) จะแสดงเป็น plain text ของชื่อ unit แทน Lookup ที่ถูก disable
 */
export function FromUnitCell({
  control,
  name,
  index,
  isOrder,
  inventoryUnitName,
  disabled,
  onUnitChange,
  usedIds,
  unitMap,
  error,
}: UnitCellProps) {
  if (!isOrder) {
    return (
      <div className="flex items-center px-2 text-xs text-muted-foreground">
        {inventoryUnitName}
      </div>
    );
  }
  return (
    <div className="flex items-center">
      <Controller
        control={control}
        name={`${name}.${index}.from_unit_id`}
        render={({ field }) =>
          disabled ? (
            <span className="px-2 text-xs">{unitMap.get(field.value) ?? ""}</span>
          ) : (
            <LookupUnit
              value={field.value}
              onValueChange={(v) => onUnitChange(index, v)}
              disabled={disabled}
              excludeIds={usedIds.filter((id) => id !== field.value)}
              size="xs"
              error={error}
            />
          )
        }
      />
    </div>
  );
}

/**
 * Cell แสดง/แก้ไขหน่วยปลายทาง (to_unit) สำหรับ ingredient_units
 * โหมด order_units จะแสดงชื่อ inventory unit อ่านอย่างเดียว
 * โหมด view (disabled) จะแสดงเป็น plain text ของชื่อ unit แทน Lookup ที่ถูก disable
 */
export function ToUnitCell({
  control,
  name,
  index,
  isOrder,
  inventoryUnitName,
  disabled,
  onUnitChange,
  usedIds,
  unitMap,
  error,
}: UnitCellProps) {
  if (isOrder) {
    return (
      <div className="flex items-center px-2 text-xs text-muted-foreground">
        {inventoryUnitName}
      </div>
    );
  }
  return (
    <div className="flex items-center">
      <Controller
        control={control}
        name={`${name}.${index}.to_unit_id`}
        render={({ field }) =>
          disabled ? (
            <span className="px-2 text-xs">{unitMap.get(field.value) ?? ""}</span>
          ) : (
            <LookupUnit
              value={field.value}
              onValueChange={(v) => onUnitChange(index, v)}
              disabled={disabled}
              excludeIds={usedIds.filter((id) => id !== field.value)}
              size="xs"
              error={error}
            />
          )
        }
      />
    </div>
  );
}

interface ConversionPreviewProps {
  readonly control: Control<ProductFormValues>;
  readonly name: UnitArrayName;
  readonly index: number;
  readonly unitMap: Map<string, string>;
}

/**
 * แสดงตัวอย่างการแปลงหน่วยสด ๆ เช่น "1 Box = 12 EA"
 * ใช้ useWatch กับ field เฉพาะของ row เพื่อ re-render ขั้นต่ำ
 */
export function ConversionPreview({
  control,
  name,
  index,
  unitMap,
}: ConversionPreviewProps) {
  const fromId = useWatch({ control, name: `${name}.${index}.from_unit_id` });
  const toId = useWatch({ control, name: `${name}.${index}.to_unit_id` });
  const fromQty = useWatch({ control, name: `${name}.${index}.from_unit_qty` });
  const toQty = useWatch({ control, name: `${name}.${index}.to_unit_qty` });

  if (!fromId || !toId) {
    return <div className="flex items-center text-muted-foreground"></div>;
  }

  const fromName = unitMap.get(fromId) ?? "?";
  const toName = unitMap.get(toId) ?? "?";
  return (
    <div className="flex items-center whitespace-nowrap text-muted-foreground">
      {fromQty} {fromName} = {toQty} {toName}
    </div>
  );
}
