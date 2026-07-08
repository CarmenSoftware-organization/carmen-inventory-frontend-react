import type { UseFormReturn, FieldArrayWithId } from "react-hook-form";
import { LocationsEditor } from "./po-items-grid-locations";
import type { PoFormValues } from "./po-form-schema";

export type PoItemField = FieldArrayWithId<PoFormValues, "items", "id">;

interface PoItemExpandedProps {
  readonly item: PoItemField;
  readonly form: UseFormReturn<PoFormValues>;
  readonly itemFields: PoItemField[];
  readonly locationsDisabled: boolean;
  readonly readOnly: boolean;
  /** % ของความกว้าง table ที่ต้อง indent ให้ตรงขอบซ้าย column Product */
  readonly leftInsetPct: number;
}

/**
 * เนื้อหาแถวที่ expand ของ PO item — Locations editor (indent ให้ตรง column Product)
 */
export function PoItemExpanded({
  item,
  form,
  itemFields,
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
    // ไม่ contribute กับ intrinsic width → ไม่ดัน column ให้ยืด (overflow scroll ในตัว)
    // paddingLeft = % ให้ตรงขอบ column Product + 0.75rem (px-3 ของ cell) ให้ตรงตัวอักษร
    <div
      className="w-0 min-w-full overflow-x-auto p-2"
      style={{ paddingLeft: `calc(${leftInsetPct}% + 0.75rem)` }}
    >
      <LocationsEditor
        form={form}
        index={index}
        disabled={locationsDisabled}
        readOnly={readOnly}
      />
    </div>
  );
}
