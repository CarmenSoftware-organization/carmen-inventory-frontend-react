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

/**
 * ตารางสินค้าที่ workflow เลือกไว้ — ใช้ตอนโหมดอ่าน แทน tree ที่มีไว้ติ๊กเลือก
 *
 * โหมดอ่านคนอ่านอยากรู้ว่า "workflow นี้ครอบสินค้าอะไรบ้าง" ตารางแบนตอบตรงกว่า
 * ต้นไม้ที่ต้องกางทีละกิ่ง ส่วนตอนแก้ไขยังเป็น tree เหมือนเดิมเพราะติ๊กทั้งหมวดทีเดียวได้
 *
 * ไม่เปิด sort — คอลัมน์ # ใช้ `row.index` ซึ่งเป็นลำดับในข้อมูลต้นทาง เปิด
 * client sort เมื่อไหร่เลขจะไม่ตรงกับลำดับที่เห็นบนจอ
 */
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
      size: 140,
      header: tfl("code"),
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "name",
      size: 320,
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
      size: 180,
      header: tfl("category"),
      cell: ({ row }) => row.original.product_category?.name || "—",
    },
    {
      id: "sub_category",
      size: 180,
      header: tfl("subCategory"),
      cell: ({ row }) => row.original.product_sub_category?.name || "—",
    },
    {
      id: "item_group",
      size: 180,
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
