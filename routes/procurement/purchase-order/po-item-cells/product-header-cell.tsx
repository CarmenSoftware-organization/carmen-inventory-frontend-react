import { Badge } from "@/components/ui/badge";
import type { UseFormReturn } from "react-hook-form";
import type { PoFormValues } from "../po-form-schema";
import { ProductCell } from "./product-cell";
import { StatusCell } from "./status-cell";

interface CellProps {
  readonly form: UseFormReturn<PoFormValues>;
  readonly index: number;
  readonly disabled: boolean;
  readonly readOnly: boolean;
}

interface ProductHeaderCellProps extends CellProps {
  readonly isFoc: boolean;
  readonly showStatusBadge: boolean;
  /** ผู้อนุมัติในโหมดแก้ไขล้างสถานะรายแถวกลับเป็นรอได้ */
  readonly canResetStatus?: boolean;
}

/**
 * Product cell — name (ProductCell) + FOC/Status badges + local name + code/SKU
 *
 * Font ของทุก line ใช้ inherit จาก parent (`text-xs` บน table) — ไม่ override
 */
export function ProductHeaderCell({
  form,
  index,
  disabled,
  readOnly,
  isFoc,
  showStatusBadge,
  canResetStatus,
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
        {showStatusBadge && (
          <StatusCell
            control={form.control}
            form={form}
            index={index}
            canReset={canResetStatus}
          />
        )}
      </div>
    </div>
  );
}
