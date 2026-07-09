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
import type { PriceList } from "@/types/price-list";
import type { PriceListFormValues } from "./pl-form-schema";
import { buildPlProductColumns } from "./pl-product-columns";
import type { DetailField } from "./pl-product-cells";
import { PLProductGroupedView } from "./pl-product-grouped-view";

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
 * Dispatcher: view mode → grouped read-only table (product ซ้ำ group เป็นกลุ่ม);
 * edit/add → editable DataGrid เดิม แยกเป็นคนละ component เพื่อให้ hooks ของแต่ละ
 * ฝั่งเรียกแบบ unconditional (ไม่ชน rules-of-hooks) และ edit path ไม่เปลี่ยน
 */
export function PLProductTable(props: PLProductTableProps) {
  if (props.isView)
    return (
      <PLProductGroupedView
        detailRefs={props.detailRefs ?? []}
        tfl={props.tfl}
      />
    );
  return <PLProductEditTable {...props} />;
}

function PLProductEditTable({
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
  const dupConfirm = useDuplicateProductConfirm();
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
        confirmDuplicate: dupConfirm.confirm,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dupConfirm.confirm is stable
    [form, isView, isDisabled, tfl, onRemove, removeLabel, detailRefs],
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
