import type { UseFormReturn, FieldArrayWithId } from "react-hook-form";
import { LocationsEditor } from "./po-items-grid-locations";
import type { PoFormValues } from "./po-form-schema";

export type PoItemField = FieldArrayWithId<PoFormValues, "items", "id">;

interface PoItemExpandedProps {
  readonly item: PoItemField;
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemFields: PoItemField[];
  readonly disabled: boolean;
  readonly locationsDisabled: boolean;
  readonly readOnly: boolean;
  /** % ของความกว้าง table ที่ต้อง indent ให้ตรงขอบซ้าย column Product */
  readonly leftInsetPct: number;
}

/**
 * เนื้อหาแถวที่ expand ของ PO item — location rows คอลัมน์เดียวกับ product row
 * (order/rec/disc%/tax แก้ได้รายตัว, Sub/Dis/Net/Tax/Amt คำนวณต่อ location)
 * indent ให้ตรง column Product
 */
export function PoItemExpanded({
  item,
  form,
  itemFields,
  disabled,
  locationsDisabled,
  readOnly,
  leftInsetPct,
}: PoItemExpandedProps) {
  "use no memo";
  const index = Math.max(
    itemFields.findIndex((f) => f.id === item.id),
    0,
  );
  return (
    // w-0 min-w-full → เนื้อหา expand กว้างเท่า table (sum ของ column) เท่านั้น
    // paddingLeft = % ให้ตรงขอบ column Product → location table align กับ product row
    <div
      className="w-0 min-w-full overflow-x-auto py-1"
      style={{ paddingLeft: `${leftInsetPct}%` }}
    >
      <LocationsEditor
        form={form}
        index={index}
        disabled={locationsDisabled}
        fieldsDisabled={disabled}
        readOnly={readOnly}
        showActionCol={!disabled && !readOnly}
      />
    </div>
  );
}
