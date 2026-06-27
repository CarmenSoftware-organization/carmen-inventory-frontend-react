import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import {
  selectColumn,
  indexColumn,
  actionColumn,
} from "@/components/ui/data-grid/columns";
import type { User } from "@/types/workflows";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseUserTableOptions {
  users: User[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

/**
 * Hook สร้าง react-table instance สำหรับตารางผู้ใช้ พร้อมคอลัมน์ชื่อ/อีเมล/แผนก/action
 * @param options - users, totalRecords, params, tableConfig, onEdit และ onDelete
 * @returns react-table instance สำหรับ User list
 * @example
 * const table = useUserTable({ users, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useUserTable({
  users,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseUserTableOptions) {
  "use no memo";

  const columns: ColumnDef<User>[] = [
    selectColumn<User>(),
    indexColumn<User>(params),
    {
      accessorKey: "firstname",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.firstname} {row.original.lastname}
        </CellAction>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Email" />
      ),
    },
    {
      id: "department",
      accessorFn: (row) =>
        row.department?.code
          ? `${row.department.code} — ${row.department.name}`
          : (row.department?.name ?? ""),
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Department" />
      ),
    },
    actionColumn<User>(onDelete),
  ];

  return useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (params.perpage as number)),
  });
}
