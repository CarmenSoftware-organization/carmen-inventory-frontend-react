"use no memo";

import { memo } from "react";
import type { Control } from "react-hook-form";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PrFormValues } from "../pr-form-schema";
import { useIsRowLocked } from "./helpers";

export const DeleteCell = memo(function DeleteCell({
  control,
  index,
  onDelete,
}: {
  control: Control<PrFormValues>;
  index: number;
  onDelete: (index: number) => void;
}) {
  const isRowLocked = useIsRowLocked(control, index);

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      aria-label="Remove"
      disabled={isRowLocked}
      onClick={() => onDelete(index)}
    >
      <Trash2 />
    </Button>
  );
});
