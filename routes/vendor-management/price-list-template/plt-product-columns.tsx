import type { UseFormReturn } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { ProductLabels } from "./plt-form-labels";
import type { PltFormValues } from "./plt-form-schema";
import {
  NoteCell,
  ProductCell,
  QtyCell,
  UnitCell,
  type DetailField,
  type ProductRef,
} from "./plt-product-cells";

interface BuildColumnsOptions {
  readonly form: UseFormReturn<PltFormValues>;
  readonly priceListTemplate?: PriceListTemplate;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onRemove: (idx: number) => void;
  readonly labels: ProductLabels;
}

/**
 * สร้างชุด column ของ PLT product table — column ชุดเดียวใช้ทั้ง view/edit
 * แต่ละ cell (ดู `plt-product-cells`) branch `isView` เอง ส่วน actions column
 * แสดงเฉพาะตอน edit
 */
export function buildPltProductColumns({
  form,
  priceListTemplate,
  isView,
  isDisabled,
  onRemove,
  labels,
}: BuildColumnsOptions): ColumnDef<DetailField>[] {
  const findProductRef = (rowIndex: number): ProductRef | undefined => {
    const productId = form.getValues(`details.${rowIndex}.product_id`);
    if (!productId) return undefined;
    return priceListTemplate?.products?.find((p) => p.product_id === productId);
  };

  const cols: ColumnDef<DetailField>[] = [
    {
      id: "index",
      size: 60,
      header: () => "#",
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">
          {row.index + 1}
        </span>
      ),
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
    },
    {
      id: "product",
      size: 300,
      header: () => labels.product,
      cell: ({ row }) => (
        <ProductCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
          productRef={findProductRef(row.index)}
        />
      ),
    },
    {
      id: "unit",
      size: 160,
      header: () => labels.unit,
      cell: ({ row }) => (
        <UnitCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
        />
      ),
    },
    {
      id: "qty",
      size: 112,
      header: () => labels.qty,
      cell: ({ row }) => (
        <QtyCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
        />
      ),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      id: "note",
      header: () => labels.notePlaceholder,
      size: 260,
      cell: ({ row }) => (
        <NoteCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
          placeholder={labels.notePlaceholder}
        />
      ),
    },
  ];

  if (!isView) {
    cols.push({
      id: "actions",
      size: 60,
      header: () => null,
      cell: ({ row }) =>
        isDisabled ? null : (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={labels.removeTier}
            onClick={() => onRemove(row.index)}
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
          >
            <Trash2 />
          </Button>
        ),
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
    });
  }

  return cols;
}
