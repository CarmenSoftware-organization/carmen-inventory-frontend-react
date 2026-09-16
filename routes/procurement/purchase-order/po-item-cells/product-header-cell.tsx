import { Badge } from "@/components/ui/badge";
import type { UseFormReturn } from "react-hook-form";
import type { PoFormValues } from "../po-form-schema";
import { ProductCell } from "./product-cell";

interface CellProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

interface ProductHeaderCellProps extends CellProps {
  readonly isFoc: boolean;
}

export function ProductHeaderCell({
  form,
  index,
  disabled,
  readOnly,
  isFoc,
}: ProductHeaderCellProps) {
  "use no memo";
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <div className="min-w-0 flex-1">
          <ProductCell
            control={form.control}
            form={form}
            index={index}
            disabled={disabled}
            readOnly={readOnly}
          />
        </div>
        {isFoc && (
          <Badge variant="success-light" size="xs">
            FOC
          </Badge>
        )}
      </div>
    </div>
  );
}
