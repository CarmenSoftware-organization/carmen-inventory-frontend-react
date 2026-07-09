import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import type { PriceList } from "@/types/price-list";
import type { PriceListFormValues } from "./pl-form-schema";
import { buildPlProductColumns } from "./pl-product-columns";
import type { DetailField } from "./pl-product-cells";

interface PLProductTableProps {
  readonly form: UseFormReturn<PriceListFormValues>;
  readonly detailFields: DetailField[];
  readonly detailRefs?: PriceList["pricelist_detail"];
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onRemove: (idx: number) => void;
  readonly tfl: (key: string) => string;
  readonly removeLabel: string;
}

/**
 * Inline price-list table — TanStack DataGrid (project standard) ตัวเดียวกัน
 * ทั้ง view และ edit/add: column ชุดเดียว (ดู `pl-product-columns`), แต่ละ cell
 * (ดู `pl-product-cells`) branch `isView` เอง — actions column แสดงเฉพาะตอน edit
 */
export function PLProductTable({
  form,
  detailFields,
  detailRefs,
  isView,
  isDisabled,
  onRemove,
  tfl,
  removeLabel,
}: PLProductTableProps) {
  "use no memo";
  const columns = useMemo<ColumnDef<DetailField>[]>(
    () =>
      buildPlProductColumns({
        form,
        detailRefs,
        isView,
        isDisabled,
        onRemove,
        tfl,
        removeLabel,
      }),
    [form, isView, isDisabled, tfl, onRemove, removeLabel, detailRefs],
  );

  const table = useReactTable({
    data: detailFields,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={detailFields.length}
      tableLayout={{ headerSticky: true }}
    >
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}
