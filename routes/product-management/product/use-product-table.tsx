import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { StatusDotBadge } from "@/components/ui/status-dot-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  actionColumn,
  auditColumns,
  columnSkeletons,
  indexColumn,
  selectColumn,
} from "@/components/ui/data-grid/columns";
import type { Product } from "@/types/product";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";
import { getProductStatusLabel } from "@/constant/product-status";

/** เซลล์ข้อความ truncate … เมื่อยาวเกิน column · hover โชว์ค่าเต็มด้วย Tooltip */
const truncCell = (value: string) =>
  value ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block truncate">{value}</span>
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  ) : (
    <span className="block truncate">{value}</span>
  );

interface UseProductTableOptions {
  products: Product[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

/**
 * Hook สร้าง TanStack Table สำหรับรายการสินค้า
 *
 * สร้างคอลัมน์ code, name, local_name, inventory_unit, category, sub_category,
 * item_group, status (badge active/inactive) พร้อม select/index/action columns
 * ส่งคืน table instance ของ `@tanstack/react-table` พร้อม pageCount จาก totalRecords/perpage
 *
 * @param options - `products`, `totalRecords`, `params`, `tableConfig`, `onEdit`, `onDelete`
 * @returns Table instance ของ react-table พร้อมใช้กับ DataGrid
 * @example
 * ```tsx
 * const table = useProductTable({ products, totalRecords, params, tableConfig, onEdit, onDelete });
 * ```
 */
export function useProductTable({
  products,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseProductTableOptions) {
  "use no memo";

  const tfl = useTranslations("field");
  const ts = useTranslations("status");
  const { dateTimeFormat } = useProfile();

  const dataColumns: ColumnDef<Product>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("code")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.code}
        </CellAction>
      ),
      meta: { headerTitle: tfl("code"), skeleton: columnSkeletons.text },
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => {
        const name = row.original.name || "...";
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <CellAction
                onClick={() => onEdit(row.original)}
                className="block w-full truncate"
              >
                {name}
              </CellAction>
            </TooltipTrigger>
            <TooltipContent>{name}</TooltipContent>
          </Tooltip>
        );
      },
      size: 350,
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.textShort },
    },
    {
      accessorKey: "local_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("localName")} />
      ),
      cell: ({ row }) => truncCell(row.original.local_name ?? ""),
      size: 300,
      meta: { headerTitle: tfl("localName"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "inventory_unit_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("unit")} />
      ),
      meta: { headerTitle: tfl("unit"), skeleton: columnSkeletons.text },
    },
    {
      id: "product_category_name",
      accessorFn: (row) => row.product_category?.name ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("category")} />
      ),
      cell: ({ row }) => truncCell(row.original.product_category?.name ?? ""),
      enableSorting: false,
      meta: { headerTitle: tfl("category"), skeleton: columnSkeletons.text },
    },
    {
      id: "product_sub_category_name",
      accessorFn: (row) => row.product_sub_category?.name ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("subCategory")} />
      ),
      cell: ({ row }) =>
        truncCell(row.original.product_sub_category?.name ?? ""),
      enableSorting: false,
      meta: { headerTitle: tfl("subCategory"), skeleton: columnSkeletons.text },
    },
    {
      id: "product_item_group_name",
      accessorFn: (row) => row.product_item_group?.name ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("itemGroup")} />
      ),
      cell: ({ row }) => truncCell(row.original.product_item_group?.name ?? ""),
      enableSorting: false,
      meta: { headerTitle: tfl("itemGroup"), skeleton: columnSkeletons.text },
    },
    {
      id: "product_status_type",
      accessorKey: "product_status_type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("status")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue<string>("product_status_type");
        return (
          <StatusDotBadge
            size="sm"
            tone={status === "active" ? "success" : "neutral"}
          >
            {getProductStatusLabel(ts, status)}
          </StatusDotBadge>
        );
      },
      size: 100,
      meta: {
        headerTitle: tfl("status"),
        cellClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
    },
    ...auditColumns<Product>(tfl, dateTimeFormat),
  ];

  const allColumns: ColumnDef<Product>[] = [
    selectColumn<Product>(),
    indexColumn<Product>(params),
    ...dataColumns,
    actionColumn<Product>(onDelete, {
      activity: { id: (r) => r.id, label: (r) => r.code },
    }),
  ];

  return useReactTable({
    data: products,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      columnVisibility: { created_at: false, updated_at: false },
    },
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
