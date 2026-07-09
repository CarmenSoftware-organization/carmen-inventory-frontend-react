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
import { DuplicateProductDialog } from "@/components/ui/duplicate-product-dialog";
import { useDuplicateProductConfirm } from "@/hooks/use-duplicate-product-confirm";
import type { PriceListTemplate } from "@/types/price-list-template";
import type { ProductLabels } from "./plt-form-labels";
import type { PltFormValues } from "./plt-form-schema";
import { buildPltProductColumns } from "./plt-product-columns";
import type { DetailField } from "./plt-product-cells";

interface PltProductTableProps {
  readonly form: UseFormReturn<PltFormValues>;
  readonly detailFields: DetailField[];
  readonly priceListTemplate?: PriceListTemplate;
  readonly isView: boolean;
  readonly isDisabled: boolean;
  readonly onRemove: (idx: number) => void;
  readonly labels: ProductLabels;
}

/**
 * Inline DataGrid table สำหรับ PLT details (flat MOQ tier rows)
 * แต่ละ row คือ 1 detail (1 tier ของสินค้าหนึ่งตัว) column ชุดเดียว
 * (ดู `plt-product-columns`) แต่ละ cell (ดู `plt-product-cells`) branch
 * `isView` เอง — actions column แสดงเฉพาะตอน edit
 */
export function PltProductTable({
  form,
  detailFields,
  priceListTemplate,
  isView,
  isDisabled,
  onRemove,
  labels,
}: PltProductTableProps) {
  "use no memo";
  const dupConfirm = useDuplicateProductConfirm();
  const columns = useMemo<ColumnDef<DetailField>[]>(
    () =>
      buildPltProductColumns({
        form,
        priceListTemplate,
        isView,
        isDisabled,
        onRemove,
        labels,
        confirmDuplicate: dupConfirm.confirm,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dupConfirm.confirm is stable
    [form, isView, isDisabled, labels, onRemove, priceListTemplate],
  );

  const table = useReactTable({
    data: detailFields,
    columns,
    // key rows by the stable useFieldArray id (ไม่ใช่ index) — ไม่งั้น prepend
    // ทำให้ cell ที่ index เดิมไม่ remount แล้ว lookup โชว์ค่าเดิมค้าง (stale)
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <DataGrid
        table={table}
        recordCount={detailFields.length}
        tableLayout={{ headerSticky: true }}
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
      <DuplicateProductDialog {...dupConfirm.dialogProps} />
    </>
  );
}
