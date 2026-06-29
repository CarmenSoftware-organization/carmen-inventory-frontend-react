import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { Badge } from "@/components/ui/badge";
import {
  selectColumn,
  indexColumn,
  actionColumn,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import type { Product } from "@/types/product";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { getProductStatusLabel } from "@/constant/product-status";

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
      enableSorting: false,
      meta: { headerTitle: tfl("code"), skeleton: columnSkeletons.text },
    },
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.name || "..."}
        </CellAction>
      ),
      size: 350,
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.textShort },
    },
    {
      accessorKey: "local_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("localName")} />
      ),
      enableSorting: false,
      size: 300,
      meta: { headerTitle: tfl("localName"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "inventory_unit_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("unit")} />
      ),
      enableSorting: false,
      meta: { headerTitle: tfl("unit"), skeleton: columnSkeletons.text },
    },
    {
      id: "product_category_name",
      accessorFn: (row) => row.product_category?.name ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("category")} />
      ),
      enableSorting: false,
      meta: { headerTitle: tfl("category"), skeleton: columnSkeletons.text },
    },
    {
      id: "product_sub_category_name",
      accessorFn: (row) => row.product_sub_category?.name ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("subCategory")} />
      ),
      enableSorting: false,
      meta: { headerTitle: tfl("subCategory"), skeleton: columnSkeletons.text },
    },
    {
      id: "product_item_group_name",
      accessorFn: (row) => row.product_item_group?.name ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("itemGroup")} />
      ),
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
          <Badge
            size="sm"
            variant={status === "active" ? "success" : "secondary"}
          >
            {getProductStatusLabel(ts, status)}
          </Badge>
        );
      },
      size: 100,
      enableSorting: false,
      meta: {
        headerTitle: tfl("status"),
        cellClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
    },
  ];

  const allColumns: ColumnDef<Product>[] = [
    selectColumn<Product>(),
    indexColumn<Product>(params),
    ...dataColumns,
    actionColumn<Product>(onDelete),
  ];

  return useReactTable({
    data: products,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
