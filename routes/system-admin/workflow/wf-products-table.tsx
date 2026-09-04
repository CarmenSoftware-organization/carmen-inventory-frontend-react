import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { PackageSearch } from "lucide-react";
import { useTranslations } from "use-intl";
import EmptyComponent from "@/components/empty-component";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { indexColumn } from "@/components/ui/data-grid/columns";
import type { Product } from "@/types/workflows";

export function WfProductsTable({
  products,
}: {
  readonly products: Product[];
}) {
  "use no memo";
  const t = useTranslations("systemAdmin.workflow");
  const tfl = useTranslations("field");

  const columns: ColumnDef<Product>[] = [
    indexColumn<Product>({}),
    {
      accessorKey: "code",
      size: 100,
      header: tfl("code"),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "name",
      size: 200,
      header: tfl("productName"),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate">{row.original.name}</p>
          {row.original.local_name && (
            <p className="text-muted-foreground truncate text-xs">
              {row.original.local_name}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "category",
      size: 140,
      header: tfl("category"),
      cell: ({ row }) => row.original.product_category?.name || "—",
    },
    {
      id: "sub_category",
      size: 140,
      header: tfl("subCategory"),
      cell: ({ row }) => row.original.product_sub_category?.name || "—",
    },
    {
      id: "item_group",
      size: 140,
      header: tfl("itemGroup"),
      cell: ({ row }) => row.original.product_item_group?.name || "—",
    },
    {
      id: "unit",
      size: 120,
      header: tfl("unit"),
      cell: ({ row }) => row.original.inventory_unit?.name || "—",
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <DataGrid
      table={table}
      recordCount={products.length}
      tableLayout={{ headerSticky: true, columnsResizable: true }}
      emptyMessage={
        <EmptyComponent
          icon={PackageSearch}
          title={t("noProductsMatch")}
          description={t("noProductsAvailable")}
        />
      }
    >
      <DataGridContainer scroll className="max-h-105">
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}
