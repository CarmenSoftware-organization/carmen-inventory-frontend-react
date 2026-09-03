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
import { ErrorState } from "@/components/ui/error-state";
import { PrintDocumentButton } from "@/components/print-document-button";
import EmptyComponent from "@/components/empty-component";
import { useSrStockMovements } from "./use-sr";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type {
  SrStockMovementItem,
  StoreRequisitionStatus,
} from "@/types/store-requisition";
import { srStockVisible } from "./sr-form-helpers";

interface SrStockTableProps {
  /** ใบที่ยังไม่บันทึกไม่มี id — ไม่ยิง API และปุ่มพิมพ์กดไม่ได้ */
  readonly srId?: string;
  readonly srNo?: string;
  /** ต่ำกว่า completed = ยังไม่มีอะไรให้ดู (ดู `srStockVisible`) */
  readonly docStatus?: StoreRequisitionStatus;
}

/** ตัวกรองทิศทาง — ค่าว่าง = ทั้งเข้าและออก */
type StockDirection = "" | "in" | "out";

/** ค่าที่ backend ส่งมาแทน "ไม่มี lot" — โชว์เป็นขีดให้เข้าชุดกับคอลัมน์อื่น */
const NO_LOT = "-";

/**
 * ตารางการเคลื่อนไหวสต๊อกของใบเบิก (แท็บ Stock Movement)
 *
 * **ข้อมูลมาจาก API ไม่ใช่จากฟอร์ม** — ของเดิมแตกแถวเข้า/ออกเองจาก `items` ใน
 * ฟอร์ม แล้วเดาว่าของวิ่งเท่ากับ `issued_qty` ซึ่งเป็น "สิ่งที่ควรจะเกิด" ไม่ใช่
 * สิ่งที่ระบบบันทึกจริง แถมราคาต่อหน่วยเป็น 0 ตายตัวเพราะฟอร์มไม่มีราคา ตอนนี้
 * `GET .../stock-movements` ส่งแถวที่แตกขาเข้า/ขาออกมาให้แล้วพร้อม lot กับต้นทุนจริง
 *
 * **ยิงตอนคลิกแท็บเท่านั้น** — Radix ถอด `TabsContent` ที่ไม่ได้เลือกออกจาก DOM
 * คอมโพเนนต์นี้จึง mount ตอนกดแท็บ ไม่ใช่ตอนเปิดฟอร์ม (ดู `useSrStockMovements`)
 */
export function SrStockTable({ srId, srNo, docStatus }: SrStockTableProps) {
  "use no memo";
  const t = useTranslations("storeOperation.storeRequisition");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");
  const [direction, setDirection] = useState<StockDirection>("");

  const canView = srStockVisible(docStatus);
  const { data, isLoading, isError, error, refetch } = useSrStockMovements(
    srId,
    { enabled: canView },
  );

  const rows = useMemo(() => data?.items ?? [], [data]);

  // กรองฝั่ง client — ทั้งใบมาในก้อนเดียวอยู่แล้ว ไม่มี query param ให้ส่งกลับไป
  const visibleRows = useMemo(() => {
    if (!direction) return rows;
    return rows.filter((row) =>
      direction === "in" ? row.qty_in > 0 : row.qty_out > 0,
    );
  }, [rows, direction]);

  const columns = useMemo<ColumnDef<SrStockMovementItem>[]>(() => {
    const qtyCell = (value: number) => (
      <FieldPlainText className="justify-end tabular-nums">
        {value}
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

    const cols: ColumnDef<SrStockMovementItem>[] = [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => row.original.sequence_no,
        size: 40,
        meta: {
          headerClassName: "text-center",
          cellClassName: "text-center text-muted-foreground",
        },
      },
      {
        accessorKey: "location_name",
        header: tfl("location"),
        cell: ({ row }) => (
          <FieldPlainText>{row.original.location_name}</FieldPlainText>
        ),
        size: 200,
      },
      {
        accessorKey: "product_name",
        header: tfl("product"),
        cell: ({ row }) => (
          <FieldPlainText>{row.original.product_name}</FieldPlainText>
        ),
        size: 220,
      },
      {
        accessorKey: "inventory_unit_name",
        header: tfl("unit"),
        cell: ({ row }) => (
          <FieldPlainText>{row.original.inventory_unit_name}</FieldPlainText>
        ),
        size: 100,
      },
      {
        accessorKey: "lot_no",
        header: tfl("lotNo"),
        cell: ({ row }) => {
          const lot = row.original.lot_no;
          return lot && lot !== NO_LOT ? (
            <FieldPlainText>{lot}</FieldPlainText>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "qty_in",
        header: tfl("in"),
        cell: ({ row }) => qtyCell(row.original.qty_in),
        size: 110,
        meta: rightAligned,
      },
      {
        accessorKey: "qty_out",
        header: tfl("out"),
        cell: ({ row }) => qtyCell(row.original.qty_out),
        size: 110,
        meta: rightAligned,
      },
      {
        accessorKey: "cost_per_unit",
        header: tfl("unitPrice"),
        cell: ({ row }) => moneyCell(row.original.cost_per_unit),
        size: 120,
        meta: rightAligned,
      },
      {
        accessorKey: "total_cost",
        header: tfl("totalAmount"),
        cell: ({ row }) => moneyCell(row.original.total_cost),
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
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!canView) {
    return <EmptyComponent icon={BoxIcon} title={t("stockNeedsCompleted")} />;
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-3">
      {/* is_posted=false = ตัวเลขยังเป็นการคาดการณ์จากตัวใบ ยังไม่ได้ตัดสต๊อกจริง
          ไม่บอกตรงนี้คนจะอ่านตารางว่าของขยับไปแล้ว ซึ่งเป็นคนละเรื่องกับความจริง */}
      {data && !data.is_posted && (
        <p className="text-muted-foreground text-xs">{t("stockNotPosted")}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
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
        isLoading={isLoading}
        emptyMessage={
          // มีแถวอยู่แต่กรองแล้วไม่เหลือ = หาไม่เจอ ไม่ใช่ใบเปล่า
          rows.length > 0 ? (
            <EmptyComponent icon={BoxIcon} title={tc("noDataFound")} />
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
