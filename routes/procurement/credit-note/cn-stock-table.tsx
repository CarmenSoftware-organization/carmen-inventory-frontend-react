import { useMemo } from "react";
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
import { NameWithSubtext } from "@/components/share/name-with-sub-text";
import { ErrorState } from "@/components/ui/error-state";
import EmptyComponent from "@/components/empty-component";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import { CN_STATUS, type CnStockMovementItem } from "@/types/credit-note";
import { useCnStockMovements } from "./use-credit-note";

const NO_LOT = "-";

/**
 * ใบนี้ดูการเคลื่อนไหวสต๊อกได้หรือยัง — เกณฑ์เดียวกับ SR: เฉพาะใบที่ปิดจบแล้ว
 * ก่อนถึง completed ของยังไม่ขยับจริง โชว์ตารางไว้มีแต่ทำให้คนเข้าใจว่าตัดสต๊อกแล้ว
 */
export function cnStockVisible(docStatus?: string): boolean {
  return docStatus === CN_STATUS.COMPLETED;
}

/**
 * ตารางการเคลื่อนไหวสต๊อกของใบลดหนี้ (แท็บ Stock Movement)
 *
 * ไม่มีตัวกรองเข้า/ออกแบบ SR — ใบลดหนี้คืนของออกทางเดียว (`quantity_return` หัก
 * จากล็อตของใบรับ ส่วน `amount_discount` ปรับต้นทุนโดยไม่ขยับของเลย) ตัวกรองที่มี
 * ค่าใช้ได้ค่าเดียวคือปุ่มหลอก
 */
export function CnStockTable({
  cnId,
  docStatus,
}: {
  readonly cnId?: string;
  readonly docStatus?: string;
}) {
  "use no memo";
  const t = useTranslations("procurement.creditNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const canView = cnStockVisible(docStatus);
  const { data, isLoading, isError, error, refetch } = useCnStockMovements(
    cnId,
    { enabled: canView },
  );

  const rows = useMemo(() => data?.items ?? [], [data]);

  const columns = useMemo<ColumnDef<CnStockMovementItem>[]>(() => {
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

    const cols: ColumnDef<CnStockMovementItem>[] = [
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
          <NameWithSubtext
            primary={row.original.product_name}
            secondary={row.original.product_local_name ?? undefined}
          />
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
      // ไม่มีคอลัมน์ขาเข้า — ใบลดหนี้ไม่เคยเอาของเข้า มีแต่คืนออกกับปรับเงินเปล่า ๆ
      {
        accessorKey: "return_qty",
        header: t("stockReturnQty"),
        cell: ({ row }) => qtyCell(row.original.return_qty),
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
    // ดัน py-2 ตาม DESIGN.md เหมือนตารางสต๊อกของใบเบิก
    return cols.map((col) => ({
      ...col,
      meta: {
        ...col.meta,
        cellClassName: cn("py-2 align-middle", col.meta?.cellClassName),
      },
    }));
  }, [t, tfl]);

  const table = useReactTable({
    data: rows,
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
      {/* เทียบกับ false ตรง ๆ — ฟิลด์นี้อาจไม่มีใน response ซึ่งแปลว่า "ไม่รู้"
          ไม่ใช่ "ยังไม่ได้ตัด" บอกผิดคือบอกว่าตัวเลขจริงเป็นตัวเลขคาดการณ์ */}
      {data?.is_posted === false && (
        <p className="text-muted-foreground text-xs">{t("stockNotPosted")}</p>
      )}

      <DataGrid
        table={table}
        recordCount={rows.length}
        isLoading={isLoading}
        emptyMessage={
          <EmptyComponent
            icon={BoxIcon}
            title={tc("noDataFound")}
            description={t("stockNoItemsDesc")}
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
