import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { HighlightText } from "@/components/ui/highlight-text";
import SearchInput from "@/components/search-input";
import EmptyComponent from "@/components/empty-component";
import { useTranslations } from "use-intl";

interface ProductTableRow {
  id: string;
  code: string | null;
  name: string | null;
  local_name?: string | null;
  inventory_unit_name?: string | null;
}

interface ProductTableProps {
  readonly products: ProductTableRow[];
  readonly className?: string;
}

export function ProductTable({ products, className }: ProductTableProps) {
  "use no memo";
  const t = useTranslations("common");
  const [search, setSearch] = useState("");

  const filteredProducts = useMemo(() => {
    const valid = products.filter((p) => p.code && p.name);
    const q = search.trim().toLowerCase();
    if (!q) return valid;
    return valid.filter(
      (p) =>
        (p.code ?? "").toLowerCase().includes(q) ||
        (p.name ?? "").toLowerCase().includes(q) ||
        (p.local_name ?? "").toLowerCase().includes(q) ||
        (p.inventory_unit_name ?? "").toLowerCase().includes(q),
    );
  }, [products, search]);

  const columns: ColumnDef<ProductTableRow>[] = useMemo(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{row.index + 1}</span>
        ),
        size: 50,
        meta: { headerClassName: "text-center", cellClassName: "text-center" },
      },
      {
        accessorKey: "code",
        header: "Code",
        cell: ({ row }) => (
          <HighlightText text={row.original.code ?? ""} query={search} />
        ),
        size: 60,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <HighlightText text={row.original.name || "..."} query={search} />
        ),
      },
      {
        accessorKey: "local_name",
        header: "Local Name",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            <HighlightText
              text={row.original.local_name ?? ""}
              query={search}
            />
          </span>
        ),
      },
      {
        accessorKey: "inventory_unit_name",
        header: "Inventory Unit",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            <HighlightText
              text={row.original.inventory_unit_name ?? ""}
              query={search}
            />
          </span>
        ),
      },
    ],
    [search],
  );

  const table = useReactTable({
    data: filteredProducts,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-3">
        <SearchInput
          defaultValue={search}
          containerClassName="w-96"
          onInputChange={setSearch}
          onSearch={setSearch}
        />
        <span className="text-muted-foreground text-micro">
          {filteredProducts.length} / {products.length}
        </span>
      </div>
      <DataGrid
        table={table}
        recordCount={filteredProducts.length}
        tableLayout={{ headerSticky: true }}
        emptyMessage={
          <EmptyComponent
            icon={Package}
            title={t("noData")}
            description={search ? t("noSearchResult") : t("noDataFound")}
          />
        }
      >
        {/* จำกัดความสูงแล้วเลื่อนในกรอบ — คลังหนึ่งแห่งผูกสินค้าได้เป็นพันรายการ
            ปล่อยยาวคือหน้าสูงสามหมื่นพิกเซล เลื่อนหาหัวข้อถัดไปไม่เจอ และหัว
            ตารางก็หลุดจอไปตั้งแต่แถวที่ยี่สิบ · หัวตารางปักไว้ให้อ่านคอลัมน์ออก */}
        <DataGridContainer className="flex max-h-105 flex-col">
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </DataGridContainer>
      </DataGrid>
    </div>
  );
}
