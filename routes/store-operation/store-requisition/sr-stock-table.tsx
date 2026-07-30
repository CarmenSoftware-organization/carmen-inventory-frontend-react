import { useMemo, useState } from "react";
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
import { StatusFilter } from "@/components/ui/status-filter";
import { PrintDocumentButton } from "@/components/print-document-button";
import SearchInput from "@/components/search-input";
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
  /** ใบที่ยังไม่บันทึกไม่มี id — ปุ่มพิมพ์เลยกดไม่ได้ */
  readonly srId?: string;
  readonly srNo?: string;
}

/** ตัวกรองทิศทาง — ค่าว่าง = ทั้งเข้าและออก */
type StockDirection = "" | "in" | "out";

/**
 * ตารางการเคลื่อนไหวสต๊อกของใบเบิก (แท็บ Stock Movement)
 *
 * จำนวนที่ใช้คือ `issued_qty` — ของที่จ่ายจริงเท่านั้นที่เคลื่อนไหว ใบที่ยังไม่ถึง
 * ขั้น issue จึงขึ้น 0 ทั้งตาราง ซึ่งตรงกับความจริงว่ายังไม่มีอะไรขยับ
 */
export function SrStockTable({
  items,
  fromLocationName,
  toLocationName,
  srId,
  srNo,
}: SrStockTableProps) {
  "use no memo";
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const [search, setSearch] = useState("");
  const [direction, setDirection] = useState<StockDirection>("");

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

  // ค้นหา/กรองฝั่ง client ล้วน — แถวพวกนี้คำนวณจาก items ในฟอร์มอยู่แล้ว
  // ไม่มี API ให้ยิง · กรองที่ data ตรง ๆ ได้เพราะไม่มี cell ไหนผูก index
  // ของฟอร์ม (ต่างจากตาราง PR/SR ที่ต้องกรองที่ table)
  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (direction === "in" && row.stockIn == null) return false;
      if (direction === "out" && row.stockOut == null) return false;
      if (!q) return true;
      return [row.locationName, row.productName, row.unitName].some((field) =>
        field.toLowerCase().includes(q),
      );
    });
  }, [rows, search, direction]);

  const columns = useMemo<ColumnDef<StockRow>[]>(() => {
    /** ขีด = ขานี้ไม่ใช่ทางที่ของวิ่ง (ไม่ใช่ 0 ซึ่งแปลว่าวิ่งแต่เป็นศูนย์) */
    const qtyCell = (value: number | null) => (
      <FieldPlainText className="justify-end tabular-nums">
        {value == null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          value
        )}
      </FieldPlainText>
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
      {
        accessorKey: "stockIn",
        header: tfl("in"),
        cell: ({ row }) => qtyCell(row.original.stockIn),
        size: 110,
        meta: rightAligned,
      },
      {
        accessorKey: "stockOut",
        header: tfl("out"),
        cell: ({ row }) => qtyCell(row.original.stockOut),
        size: 110,
        meta: rightAligned,
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
    data: visibleRows,
    columns,
    getRowId: (row) => row.key,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          defaultValue={search}
          onSearch={setSearch}
          onInputChange={setSearch}
          containerClassName="w-48 sm:w-64"
        />
        <StatusFilter
          value={direction}
          onChange={(value) => setDirection(value as StockDirection)}
          placeholder={tfl("stock")}
          options={[
            { label: tfl("in"), value: "in" },
            { label: tfl("out"), value: "out" },
          ]}
        />
        <div className="ms-auto flex items-center gap-2">
          <PrintDocumentButton
            documentType="SR"
            documentId={srId}
            disabled={!srId}
            filters={srNo ? { DocumentNo: srNo } : undefined}
          />
        </div>
      </div>

      <DataGrid
        table={table}
        recordCount={visibleRows.length}
        emptyMessage={
          // มีแถวอยู่แต่กรองแล้วไม่เหลือ = หาไม่เจอ ไม่ใช่ใบเปล่า
          rows.length > 0 ? (
            <EmptyComponent icon={BoxIcon} title={tc("noSearchResult")} />
          ) : (
            <EmptyComponent
              icon={BoxIcon}
              title={t("noItems")}
              description={t("noItemsDesc")}
            />
          )
        }
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
    </div>
  );
}
