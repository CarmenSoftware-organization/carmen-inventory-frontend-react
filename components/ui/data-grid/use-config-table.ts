import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useCan } from "@/hooks/use-can";
import { usePermissionPrefix } from "@/hooks/use-permission-prefix";
import { buildPermissionKey } from "@/constant/permissions";
import {
  selectColumn,
  indexColumn,
  statusColumn,
  actionColumn,
} from "./columns";

interface UseConfigTableOptions<T> {
  data: T[];
  columns: ColumnDef<T>[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onDelete?: (item: T) => void;
  hideStatus?: boolean;
  /** เช่น `"configuration.department"` — เช็ค {prefix}.delete เพื่อ guard ปุ่ม delete ใน row */
  permissionPrefix?: string;
}

/**
 * Hook factory สร้าง TanStack Table instance สำหรับ config list pages
 *
 * รวม `selectColumn`, `indexColumn`, custom columns, `statusColumn` (ยกเว้น
 * `hideStatus`) และ `actionColumn` (เมื่อมี `onDelete`) จากนั้นส่งเข้า
 * `useReactTable` พร้อม core row model, table config และ pageCount ที่
 * คำนวณจาก `totalRecords / perpage` ใช้ "use no memo" เพื่อข้าม React Compiler
 *
 * @typeParam T - ประเภทข้อมูลแถว
 * @param options - options ของ hook
 * @param options.data - ข้อมูลแถว
 * @param options.columns - custom column definitions
 * @param options.totalRecords - จำนวน records ทั้งหมด
 * @param options.params - ParamsDto จาก URL state
 * @param options.tableConfig - tableConfig จาก `useDataGridState`
 * @param options.onDelete - callback ลบ row (เพิ่ม action column เมื่อมี)
 * @param options.hideStatus - ซ่อน status column
 * @returns TanStack Table instance พร้อม pageCount
 * @example
 * ```ts
 * const table = useConfigTable({
 *   data, columns, totalRecords, params, tableConfig, onDelete,
 * });
 * ```
 */
export function useConfigTable<T>({
  data,
  columns,
  totalRecords,
  params,
  tableConfig,
  onDelete,
  hideStatus,
  permissionPrefix,
}: UseConfigTableOptions<T>) {
  // "use no memo" opts out of React Compiler's automatic memoization.
  // TanStack Table creates new column/row objects each render; memoizing them
  // breaks reference-equality checks the library relies on internally.
  "use no memo";

  const { can, isAdmin } = useCan();
  const autoPrefix = usePermissionPrefix();
  const prefix = permissionPrefix ?? autoPrefix;
  const deletePermission = prefix
    ? buildPermissionKey(prefix, "delete")
    : undefined;
  const deleteDenied =
    !!deletePermission && !isAdmin && !can(deletePermission);

  const allColumns: ColumnDef<T>[] = [
    selectColumn<T>(),
    indexColumn<T>(params),
    ...columns,
    ...(hideStatus ? [] : [statusColumn<T>()]),
    ...(onDelete
      ? [actionColumn<T>(onDelete, { deleteDenied, deletePermission })]
      : []),
  ];

  return useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (params.perpage as number)),
  });
}
