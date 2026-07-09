import type { UseFormReturn } from "react-hook-form";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PriceList } from "@/types/price-list";
import type { PriceListFormValues } from "./pl-form-schema";
import {
  LeadCell,
  MoqCell,
  PriceCell,
  ProductCell,
  TaxCell,
  UnitCell,
  type DetailField,
} from "./pl-product-cells";

interface BuildColumnsOptions {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly detailRefs?: PriceList["pricelist_detail"];
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onRemove: (idx: number) => void;
  readonly tfl: (key: string) => string;
  readonly removeLabel: string;
  readonly confirmDuplicate: (action: () => void, productName?: string) => void;
}

/**
 * สร้างชุด column ของ price-list product table — column ชุดเดียวใช้ทั้ง view/edit
 * แต่ละ cell branch `isView` เอง (plain text vs inputs/lookups) ส่วน actions
 * column แสดงเฉพาะตอน edit
 */
export function buildPlProductColumns({
  form,
  detailRefs,
  isView,
  isDisabled,
  onRemove,
  tfl,
  removeLabel,
  confirmDuplicate,
}: BuildColumnsOptions): ColumnDef<DetailField>[] {
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
      header: () => tfl("product"),
      size: 300,
      cell: ({ row }) => (
        <ProductCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
          detailRef={detailRefs?.[row.index]}
          confirmDuplicate={confirmDuplicate}
        />
      ),
    },
    {
      id: "unit",
      header: () => tfl("unit"),
      cell: ({ row }) => (
        <UnitCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
          detailRef={detailRefs?.[row.index]}
        />
      ),
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
    },
    {
      id: "moq",
      size: 96,
      header: () => tfl("moq"),
      cell: ({ row }) => (
        <MoqCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
          detailRef={detailRefs?.[row.index]}
        />
      ),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      id: "price",
      size: 128,
      header: () => tfl("unitPrice"),
      cell: ({ row }) => (
        <PriceCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
          detailRef={detailRefs?.[row.index]}
        />
      ),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
    },
    {
      id: "tax_profile",
      header: () => tfl("taxProfile"),
      cell: ({ row }) => (
        <TaxCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
          detailRef={detailRefs?.[row.index]}
        />
      ),
    },
    {
      id: "lead",
      size: 96,
      header: () => tfl("leadTime"),
      cell: ({ row }) => (
        <LeadCell
          form={form}
          index={row.index}
          isView={isView}
          isDisabled={isDisabled}
          detailRef={detailRefs?.[row.index]}
        />
      ),
      meta: { headerClassName: "text-right", cellClassName: "text-right" },
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
            aria-label={removeLabel}
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
