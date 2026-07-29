import { memo } from "react";
import type { Control } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowSettled } from "./helpers";

export const DeleteCell = memo(function DeleteCell({
  control,
  index,
  onDelete,
}: {
  control: Control<PrFormValues>;
  index: number;
  onDelete: (index: number) => void;
}) {
  "use no memo";
  // ใช้เกณฑ์ "ตัดสินมาแล้ว" ไม่ใช่ useIsRowLocked — stage purchase แก้แถวที่ approve
  // มาได้ก็จริง แต่ลบใบที่คนอื่นอนุมัติไปแล้วทิ้งไม่ได้
  const isRowLocked = useIsRowSettled(control, index);

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-label="Remove"
      className="text-destructive hover:text-destructive/80 hover:bg-none"
      disabled={isRowLocked}
      onClick={() => onDelete(index)}
    >
      <Trash2 />
    </Button>
  );
});
