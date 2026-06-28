import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  type ColumnDef,
} from "@tanstack/react-table";
import { Package, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import EmptyComponent from "@/components/empty-component";
import { Input } from "@/components/ui/input";
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

/**
 * Helper component ไฮไลต์ substring ที่ตรงกับ query ด้วย <mark> สีเหลือง
 *
 * ใช้ภายใน ProductTable เพื่อเน้นส่วนที่ตรงกับคำค้นหาในคอลัมน์ code/name/
 * local_name/inventory_unit_name หลีกเลี่ยงการเกิด regex pitfall ด้วย
 * การ escape special chars ของ query ก่อนสร้าง RegExp
 *
 * @param props - text (ข้อความเต็ม) และ query (คำค้นหา)
 * @returns JSX fragment โดยมี <mark> ครอบส่วนที่ตรง
 * @example
 * ```tsx
 * <HighlightText text="Apple Juice" query="app" />
 * ```
 */
const HighlightText = ({
  text,
  query,
}: {
  readonly text: string;
  readonly query: string;
}) => {
  "use no memo";
  if (!text) return null;
  if (!query.trim()) return <>{text}</>;

  const escaped = query.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={`${i}-${part}`}
            className="rounded-sm bg-warning/30 text-foreground font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
};

/**
 * ตาราง read-only แสดงรายการสินค้า พร้อมช่องค้นหา + highlight
 *
 * ใช้ใน dialog หรือ section สำหรับ preview รายการสินค้าที่ผูกกับ vendor,
 * price list, location ฯลฯ กรองด้วย local search (code/name/local_name/
 * inventory_unit_name) และ highlight match ทุกคอลัมน์ แสดงตัวนับ
 * filtered/total และ EmptyComponent เมื่อไม่มีผล
 *
 * @param props - products (รายการที่จะแสดง) และ className เสริม
 * @returns JSX element ของ DataGrid
 * @example
 * ```tsx
 * <ProductTable products={vendor.products} />
 * ```
 */
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
        <div className="relative w-96">
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
            size={12}
          />
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-6 pl-8 text-[10px]"
          />
        </div>
        <span className="text-muted-foreground text-[0.6875rem]">
          {filteredProducts.length} / {products.length}
        </span>
      </div>
      <DataGrid
        table={table}
        recordCount={filteredProducts.length}
        emptyMessage={
          <EmptyComponent
            icon={Package}
            title={t("noData")}
            description={search ? t("noSearchResult") : t("noDataFound")}
          />
        }
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
    </div>
  );
}
