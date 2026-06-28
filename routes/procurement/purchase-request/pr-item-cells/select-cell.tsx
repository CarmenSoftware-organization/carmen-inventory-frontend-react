import type { Control, FieldArrayWithId } from "react-hook-form";
import type { Row } from "@tanstack/react-table";
import { DataGridTableRowSelect } from "@/components/ui/data-grid/data-grid-table";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "./helpers";

export function SelectCell({
  control,
  index,
  row,
  isHidden,
}: Readonly<{
  control: Control<PrFormValues>;
  index: number;
  row: Row<FieldArrayWithId<PrFormValues, "items", "id">>;
  isHidden?: boolean;
}>) {
  "use no memo";
  const isRowLocked = useIsRowLocked(control, index);
  if (isHidden || isRowLocked) return null;
  return <DataGridTableRowSelect row={row} />;
}
