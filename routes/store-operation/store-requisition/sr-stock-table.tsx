import { useMemo, type ReactNode } from "react";
import { useTranslations } from "use-intl";
import { BoxIcon } from "lucide-react";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { FieldPlainText } from "@/components/ui/field";
import EmptyComponent from "@/components/empty-component";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { SrFormValues } from "./sr-form-schema";
import { srItemUnitPrice } from "./sr-form-helpers";

/**
 * หนึ่งขาของการเคลื่อนไหวสต๊อก — รายการหนึ่งในใบเบิกทำให้ของออกจากคลังต้นทาง
 * และเข้าคลังปลายทาง จึงกลายเป็นสองแถวคนละคลัง
 */
interface StockRow {
  readonly key: string;
  readonly locationName: string;
  readonly productName: string;
  readonly unitName: string;
  /** null = ขานี้ไม่ใช่ทางเข้า (แสดงขีด) */
  readonly stockIn: number | null;
  readonly stockOut: number | null;
  readonly unitPrice: number;
  readonly totalAmount: number;
}

interface SrStockTableProps {
  readonly items: SrFormValues["items"];
  readonly fromLocationName: string;
  readonly toLocationName: string;
}

/**
 * ตารางการเคลื่อนไหวสต๊อกของใบเบิก (แท็บ Stock)
 *
 * จำนวนที่ใช้คือ `issued_qty` — ของที่จ่ายจริงเท่านั้นที่เคลื่อนไหว ใบที่ยังไม่ถึง
 * ขั้น issue จึงขึ้น 0 ทั้งตาราง ซึ่งตรงกับความจริงว่ายังไม่มีอะไรขยับ
 */
export function SrStockTable({
  items,
  fromLocationName,
  toLocationName,
}: SrStockTableProps) {
  "use no memo";
  const t = useTranslations("storeOperation.storeRequisition");
  const tfl = useTranslations("field");

  const rows = useMemo<StockRow[]>(() => {
    const dash = "—";
    return items.flatMap((item, index) => {
      const qty = Number(item.issued_qty ?? 0);
      const unitPrice = srItemUnitPrice(item);
      const shared = {
        productName: item.product_name,
        unitName: item.unit_name,
        unitPrice,
        totalAmount: qty * unitPrice,
      };
      return [
        {
          ...shared,
          key: `${index}-out`,
          locationName: fromLocationName || dash,
          stockIn: null,
          stockOut: qty,
        },
        {
          ...shared,
          key: `${index}-in`,
          locationName: toLocationName || dash,
          stockIn: qty,
          stockOut: null,
        },
      ];
    });
  }, [items, fromLocationName, toLocationName]);

  const columns = useMemo<ColumnDef<StockRow>[]>(() => {
    const qtyText = (value: number | null): ReactNode =>
      value == null ? <span className="text-muted-foreground">—</span> : value;

    /**
     * In กับ Out อยู่ในช่องเดียวกัน คั่นด้วยขีด — ครึ่งซ้าย/ครึ่งขวากว้างเท่ากัน
     * ทั้งคู่ชิดขวาแบบคอลัมน์ตัวเลข หลักหน่วยจึงตรงกันทุกแถว และหัวตารางใช้
     * ตัวเดียวกัน In/Out เลยลอยตรงกับค่าข้างล่างเสมอ
     */
    const stockPair = (left: ReactNode, right: ReactNode) => (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 tabular-nums">
        <span className="text-right">{left}</span>
        <span className="text-muted-foreground/40 font-normal">|</span>
        <span className="text-right">{right}</span>
      </div>
    );
    const moneyCell = (value: number) => (
      <FieldPlainText className="justify-end tabular-nums">
        {formatCurrency(value)}
      </FieldPlainText>
    );
    const rightAligned = {
      headerClassName: "text-right",
      cellClassName: "text-right",
    };

    const cols: ColumnDef<StockRow>[] = [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.index + 1,
        size: 40,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-muted-foreground",
        },
      },
      {
        accessorKey: "locationName",
        header: tfl("location"),
        cell: ({ row }) => (
          <FieldPlainText>{row.original.locationName}</FieldPlainText>
        ),
        size: 200,
      },
      {
        accessorKey: "productName",
        header: tfl("product"),
        cell: ({ row }) => (
          <FieldPlainText>{row.original.productName}</FieldPlainText>
        ),
        size: 220,
      },
      {
        accessorKey: "unitName",
        header: tfl("unit"),
        cell: ({ row }) => (
          <FieldPlainText>{row.original.unitName}</FieldPlainText>
        ),
        size: 100,
      },
      // คอลัมน์เดียว หัวสองบรรทัด: "Stock" คร่อมอยู่บน ใต้เส้นเป็น In | Out
      // เข้ากับออกคือค่าคู่ของเรื่องเดียวกัน แยกเป็นสองคอลัมน์อ่านแล้วเหมือน
      // คนละเรื่อง · หัวกับค่าใช้ layout เดียวกัน In/Out จึงตรงหลักกันเสมอ
      {
        id: "stock",
        header: () => (
          <div className="w-full">
            <div className="border-border/60 border-b py-1.5 text-center">
              {tfl("stock")}
            </div>
            <div className="py-1.5">{stockPair(tfl("in"), tfl("out"))}</div>
          </div>
        ),
        cell: ({ row }) =>
          stockPair(qtyText(row.original.stockIn), qtyText(row.original.stockOut)),
        size: 200,
      },
      {
        accessorKey: "unitPrice",
        header: tfl("unitPrice"),
        cell: ({ row }) => moneyCell(row.original.unitPrice),
        size: 120,
        meta: rightAligned,
      },
      {
        accessorKey: "totalAmount",
        header: tfl("totalAmount"),
        cell: ({ row }) => moneyCell(row.original.totalAmount),
        size: 130,
        meta: rightAligned,
      },
    ];

    // DataGrid ให้ cell มาแค่ py-1 — แถวข้อมูลล้วนแบบนี้เลยดูอัดกัน
    // ดัน py-2 ตาม DESIGN.md (แถว/เซลล์อยู่ในช่วง 2–8px) เหมือนที่ตาราง PR ทำ
    return cols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        cellClassName: cn("py-2 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [tfl]);

  const table = useReactTable({
    data: rows,
    columns,
    getRowId: (row) => row.key,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      tableClassNames={{ headerRow: "h-16", bodyRow: "h-11" }}
      emptyMessage={
        <EmptyComponent
          icon={BoxIcon}
          title={t("noItems")}
          description={t("noItemsDesc")}
        />
      }
    >
      <DataGridContainer>
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}
