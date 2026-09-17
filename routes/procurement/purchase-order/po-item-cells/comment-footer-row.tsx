import { type FieldArrayWithId, type UseFormReturn } from "react-hook-form";
import { memo } from "react";
import { Input } from "@/components/ui/input";
import { PoInventoryDialog } from "./inventory-dialog-cell";
import type { PoFormValues } from "../po-form-schema";

export const CommentFooterRow = memo(function CommentFooterRow({
  form,
  itemFields,
  item,
  isDisabled,
  placeholder,
}: {
  form: UseFormReturn<PoFormValues>;
  itemFields: FieldArrayWithId<PoFormValues, "items", "id">[];
  item: FieldArrayWithId<PoFormValues, "items", "id">;
  isDisabled: boolean;
  placeholder: string;
}) {
  "use no memo";
  const index = itemFields.findIndex((f) => f.id === item.id);

  if (index === -1) return null;
  return (
    // pb เท่ากับ py ของเซลล์แถวแม่ (2.5) — `<td>` ของแถวหมายเหตุไม่มี padding
    // ของตัวเอง ช่องไฟด้านล่างจึงต้องมาจากตรงนี้ ไม่งั้นช่องกรอกชนเส้นคั่นแถว
    <div className="flex items-center gap-2 px-3 pb-2.5">
      <Input
        id={`items-${index}-comment`}
        placeholder={placeholder}
        maxLength={256}
        className="w-96 text-xs"
        disabled={isDisabled}
        {...form.register(`items.${index}.comment`)}
      />
      <PoInventoryDialog control={form.control} index={index} />
    </div>
  );
});
