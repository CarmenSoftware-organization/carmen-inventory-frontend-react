import type { ColumnDef, ExpandedState, OnChangeFn } from "@tanstack/react-table";
import { useMemo } from "react";
import { getCoreRowModel, getExpandedRowModel, useReactTable } from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";

/** Compact document lines: shared grid styling, unclamped controls and local overflow. */
export function ApDetailGrid<T extends object>({
  rows,
  columns,
  empty = "No records.",
  expanded,
  onExpandedChange,
}: {
  rows: T[];
  columns: ColumnDef<T>[];
  empty?: string;
  expanded?: ExpandedState;
  onExpandedChange?: OnChangeFn<ExpandedState>;
}) {
  const gridColumns = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        meta: {
          ...column.meta,
          headerClassName: `whitespace-nowrap ${column.meta?.headerClassName ?? ""}`,
        },
      })),
    [columns],
  );
  const table = useReactTable({
    data: rows,
    columns: gridColumns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableExpanding: Boolean(onExpandedChange),
    getRowCanExpand: () => Boolean(onExpandedChange),
    state: expanded === undefined ? undefined : { expanded },
    onExpandedChange,
  });
  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      emptyMessage={empty}
      tableLayout={{
        width: "auto",
        dense: false,
        rowBorder: true,
        cellBorder: false,
        rowClamp: false,
      }}
    >
      <DataGridContainer scroll>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}
