import {
  useWatch,
  type FieldArrayWithId,
  type UseFormReturn,
} from "react-hook-form";
import { memo } from "react";
import { Input } from "@/components/ui/input";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "./helpers";

export const CommentFooterRow = memo(function CommentFooterRow({
  form,
  itemFields,
  item,
  isDisabled,
  placeholder,
}: {
  form: UseFormReturn<PrFormValues>;
  itemFields: FieldArrayWithId<PrFormValues, "items", "id">[];
  item: FieldArrayWithId<PrFormValues, "items", "id">;
  isDisabled: boolean;
  placeholder: string;
}) {
  "use no memo";
  const index = itemFields.findIndex((f) => f.id === item.id);
  const isRowLocked = useIsRowLocked(form.control, index === -1 ? 0 : index);
  const comment =
    useWatch({
      control: form.control,
      name: `items.${index === -1 ? 0 : index}.comment`,
    }) ?? "";
  if (index === -1) return null;
  const isReadOnly = isDisabled || isRowLocked;
  if (isReadOnly) {
    // ไม่ใช่ edit → ไม่มี comment ไม่ต้องแสดง; มีก็โชว์ในเครื่องหมายคำพูด ตัวเอียง muted
    if (!comment) return null;
    return (
      <div className="px-2 pb-4">
        <p className="text-muted-foreground text-xs italic wrap-break-word whitespace-pre-wrap">
          {`"${comment}"`}
        </p>
      </div>
    );
  }
  return (
    <div className="px-2 pb-4">
      <Input
        id={`items-${index}-comment`}
        placeholder={placeholder}
        maxLength={256}
        className="resize-none text-xs"
        {...form.register(`items.${index}.comment`)}
      />
    </div>
  );
});
