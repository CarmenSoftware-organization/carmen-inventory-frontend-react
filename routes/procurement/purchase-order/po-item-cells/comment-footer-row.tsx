import { type FieldArrayWithId, type UseFormReturn } from "react-hook-form";
import { memo } from "react";
import { Input } from "@/components/ui/input";
import { PoInventoryTooltip } from "./inventory-tooltip-cell";
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
    <div className="flex items-center gap-2 px-3">
      <Input
        id={`items-${index}-comment`}
        placeholder={placeholder}
        maxLength={256}
        className="w-96 text-xs"
        disabled={isDisabled}
        {...form.register(`items.${index}.comment`)}
      />
      <PoInventoryTooltip control={form.control} index={index} />
    </div>
  );
});
