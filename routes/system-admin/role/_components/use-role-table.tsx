"use no memo";

import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import {
  selectColumn,
  indexColumn,
  actionColumn,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import type { Role } from "@/types/role";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseRoleTableOptions {
  items: Role[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (item: Role) => void;
  onDelete: (item: Role) => void;
}

/**
 * Hook สร้าง react-table instance สำหรับตาราง Role พร้อมคอลัมน์เลือก/ลำดับ/ชื่อ/จำนวนสิทธิ์/action
 * @param options - items, totalRecords, params, tableConfig, onEdit และ onDelete
 * @returns react-table instance
 * @example
 * const table = useRoleTable({ items, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useRoleTable({
  items,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseRoleTableOptions) {
  const dataColumns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("name") || "..."}
        </CellAction>
      ),
      meta: { skeleton: columnSkeletons.text },
    },
    {
      id: "permission_count",
      accessorFn: (row) => row.permissions.length,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Permissions" />
      ),
      enableSorting: false,
      cell: ({ row }) => {
        const count = row.original.permissions.length;
        return `${count} permissions`;
      },
      meta: { skeleton: columnSkeletons.textShort },
    },
  ];

  const allColumns: ColumnDef<Role>[] = [
    selectColumn<Role>(),
    indexColumn<Role>(params),
    ...dataColumns,
    actionColumn<Role>(onDelete),
  ];

  return useReactTable({
    data: items,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
