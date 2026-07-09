import { useMemo } from "react";
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
import { FieldPlainText } from "@/components/ui/field";
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import type { PriceList } from "@/types/price-list";
import { buildGroupedRows, type GroupedRow } from "./pl-product-grouping";

interface PLProductGroupedViewProps {
  readonly detailRefs: PriceList["pricelist_detail"];
  readonly tfl: (key: string) => string;
}

/**
 * View-mode grouped table ของ price-list products — product ที่ซ้ำกัน (หลาย MOQ
 * tier) จะถูก group: ชื่อ product โชว์ครั้งเดียว แล้ว tier เรียงตาม MOQ น้อย→มาก
 * เป็น sub-row ใต้กัน (read-only, ขับด้วย detailRefs ล้วน) ใช้เฉพาะตอน view
 */
export function PLProductGroupedView({
  detailRefs,
  tfl,
}: PLProductGroupedViewProps) {
  "use no memo";
  const rows = useMemo(() => buildGroupedRows(detailRefs), [detailRefs]);

  const columns = useMemo<ColumnDef<GroupedRow>[]>(
    () => [
      {
        id: "index",
        size: 60,
        header: () => "#",
        cell: ({ row }) =>
          row.original.isFirstInGroup ? (
            <span className="text-muted-foreground tabular-nums">
              {row.original.groupNumber}
            </span>
          ) : null,
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "product",
        header: () => tfl("product"),
        size: 300,
        cell: ({ row }) =>
          row.original.isFirstInGroup ? (
            <NameWithSubtext
              primary={row.original.ref.product_name ?? ""}
              secondary={row.original.ref.product_local_name}
            />
          ) : (
            <span className="text-muted-foreground pl-2 text-xs tabular-nums">
              {row.original.isLastInGroup ? "└" : "├"}
            </span>
          ),
      },
      {
        id: "unit",
        header: () => tfl("unit"),
        cell: ({ row }) => (
          <FieldPlainText>{row.original.ref.unit_name}</FieldPlainText>
        ),
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        id: "moq",
        size: 96,
        header: () => tfl("moq"),
        cell: ({ row }) => (
          <span className="text-foreground text-xs font-semibold tabular-nums">
            {Number(row.original.ref.moq_qty) || 0}+
          </span>
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "price",
        size: 128,
        header: () => tfl("unitPrice"),
        cell: ({ row }) => (
          <span className="text-foreground text-xs font-semibold tabular-nums">
            {(Number(row.original.ref.price_without_tax) || 0).toFixed(2)}
          </span>
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
      {
        id: "tax_profile",
        header: () => tfl("taxProfile"),
        cell: ({ row }) => (
          <FieldPlainText>{row.original.ref.tax_profile_name}</FieldPlainText>
        ),
      },
      {
        id: "lead",
        size: 96,
        header: () => tfl("leadTime"),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs tabular-nums">
            {Number(row.original.ref.lead_time_days) || 0}d
          </span>
        ),
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
      },
    ],
    [tfl],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.key,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      tableLayout={{ headerSticky: true }}
    >
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}
