import type { Column, ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/ui/data-grid/data-grid-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataGridRowActions } from "@/components/ui/data-grid/data-grid-row-actions";
import { Skeleton } from "@/components/ui/skeleton";
import type { Permission } from "@/constant/permissions";
import type { ParamsDto } from "@/types/params";

export const columnSkeletons = {
  checkbox: <Skeleton className="mx-auto h-2.5 w-2.5 rounded" />,
  number: <Skeleton className="h-2 w-5" />,
  text: <Skeleton className="h-2 w-3/4" />,
  textShort: <Skeleton className="h-2 w-1/2" />,
  badge: <Skeleton className="mx-auto h-3 w-12 rounded-full" />,
};

/**
 * สร้าง ColumnDef สำหรับ checkbox เลือกแถว
 *
 * Render `DataGridTableRowSelectAll` ใน header และ `DataGridTableRowSelect`
 * ในแต่ละแถว ปิด sorting/hiding/resizing และจัดให้ column กว้าง 50px
 * align center พร้อม skeleton
 *
 * @typeParam T - ประเภทข้อมูลแถว
 * @returns ColumnDef ของ column "select"
 * @example
 * ```ts
 * const columns = [selectColumn<Currency>(), ...customColumns];
 * ```
 */
export function selectColumn<T>(): ColumnDef<T> {
  return {
    id: "select",
    header: () => <DataGridTableRowSelectAll />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 50,
    meta: {
      headerClassName: "text-center print:hidden",
      cellClassName: "text-center print:hidden",
      skeleton: columnSkeletons.checkbox,
    },
  };
}

/**
 * สร้าง ColumnDef ของคอลัมน์เลขลำดับ (#)
 *
 * คำนวณเลขลำดับจาก `row.index + 1 + (page - 1) * perpage` เพื่อให้แสดงเลข
 * ต่อเนื่องระหว่างหน้า ปิด sorting/hiding และจัดความกว้าง 50px align center
 *
 * @typeParam T - ประเภทข้อมูลแถว
 * @param params - ParamsDto ที่มี `page` และ `perpage` ของหน้าปัจจุบัน
 * @returns ColumnDef ของ index column
 * @example
 * ```ts
 * indexColumn<Currency>(params);
 * ```
 */
export function indexColumn<T>(params: ParamsDto): ColumnDef<T> {
  return {
    id: "index",
    header: "#",
    cell: ({ row }) =>
      row.index +
      1 +
      ((Number(params.page) || 1) - 1) * (Number(params.perpage) || 10),
    enableSorting: false,
    enableHiding: false,
    size: 50,
    meta: {
      headerClassName: "text-center",
      cellClassName: "text-center",
      skeleton: columnSkeletons.checkbox,
    },
  };
}

/** Status column header — แปลหัวคอลัมน์ผ่าน i18n เหมือน column อื่นในตาราง */
function StatusColumnHeader<T>({ column }: { column: Column<T, unknown> }) {
  const tfl = useTranslations("field");
  return (
    <DataGridColumnHeader
      column={column}
      title={tfl("status")}
      className="justify-center"
    />
  );
}

/**
 * สร้าง ColumnDef ของ status badge
 *
 * อ่านค่า `is_active` แล้ว render `Badge` สี success/secondary (ตรงกับ card)
 * พร้อม label "ใช้งาน"/"ไม่ใช้งาน" จาก i18n header รองรับ sort + แปล
 * จัดความกว้าง 100px align center
 *
 * @typeParam T - ประเภทข้อมูลแถว
 * @returns ColumnDef ของ status column
 * @example
 * ```ts
 * const columns = [...customColumns, statusColumn<Currency>()];
 * ```
 */
export function statusColumn<T>(): ColumnDef<T> {
  return {
    accessorKey: "is_active",
    header: ({ column }) => <StatusColumnHeader<T> column={column} />,
    cell: ({ row }) => (
      <StatusBadge active={Boolean(row.getValue("is_active"))} />
    ),
    size: 100,
    meta: {
      cellClassName: "text-center",
      headerClassName: "text-center",
      skeleton: columnSkeletons.badge,
    },
  };
}

/**
 * สร้าง ColumnDef ของ action column (ลบรายการ)
 *
 * Render `DataGridRowActions` ที่มีปุ่มลบเรียก `onDelete(row.original)` ไว้
 * ท้ายตาราง ปิด sorting และจัดความกว้าง 60px align right
 *
 * @typeParam T - ประเภทข้อมูลแถว
 * @param onDelete - callback เมื่อกดลบ row
 * @returns ColumnDef ของ action column
 * @example
 * ```ts
 * actionColumn<Currency>((item) => setDeleteTarget(item));
 * ```
 */
export function actionColumn<T>(
  onDelete: (item: T) => void,
  options?: { deleteDenied?: boolean; deletePermission?: Permission },
): ColumnDef<T> {
  return {
    id: "action",
    header: () => "",
    cell: ({ row }) => (
      <DataGridRowActions
        onDelete={() => onDelete(row.original)}
        deleteDenied={options?.deleteDenied}
        deletePermission={options?.deletePermission}
      />
    ),
    enableSorting: false,
    size: 60,
    meta: {
      headerClassName: "text-right print:hidden",
      cellClassName: "text-right print:hidden",
      skeleton: null,
    },
  };
}

/**
 * Custom action column factory — same defaults as `actionColumn` but lets you
 * provide a custom cell renderer (e.g. dropdown with Approve/Reject/Delete).
 * Auto-includes `print:hidden` so the column is omitted when printing.
 * @typeParam T - row data type
 * @param cell - cell renderer (TanStack Table CellContext)
 * @example
 * ```ts
 * customActionColumn<PurchaseRequest>(({ row }) => <PrActionDropdown item={row.original} />)
 * ```
 */
export function customActionColumn<T>(
  cell: NonNullable<ColumnDef<T>["cell"]>,
): ColumnDef<T> {
  return {
    id: "action",
    header: () => "",
    cell,
    enableSorting: false,
    size: 60,
    meta: {
      headerClassName: "text-right print:hidden",
      cellClassName: "text-right print:hidden",
      skeleton: null,
    },
  };
}
