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
import { useGrnStockMovements } from "@/hooks/use-goods-receive-note";
import { formatCurrency } from "@/lib/currency-utils";
import { cn } from "@/lib/utils";
import type { GrnStockMovementItem } from "@/types/goods-receive-note";

const NO_LOT = "-";

/**
 * ใบนี้ดูการเคลื่อนไหวสต๊อกได้หรือยัง — เกณฑ์เดียวกับ CN/SR: ต้องปิดใบแล้ว
 * (GRN ปิดใบ = committed) ก่อนหน้านั้นของยังไม่เข้าคลังจริง โชว์ตารางไว้มีแต่
 * ทำให้คนเข้าใจว่ารับเข้าสต๊อกไปแล้ว
 */
export function grnStockVisible(docStatus?: string): boolean {
  return docStatus === "committed";
}

/**
 * ตารางการเคลื่อนไหวสต๊อกของใบรับสินค้า (แท็บ Stock Movement)
 *
 * ไม่มีคอลัมน์ขาออก — ใบรับสินค้าเอาของเข้าทางเดียว ของที่คืนกลับผู้ขายเป็นเรื่อง
 * ของใบลดหนี้ (ดู `CnStockTable` ซึ่งเป็นด้านกลับกันของตารางนี้)
 */
export function GrnStockTable({
  grnId,
  docStatus,
}: {
  readonly grnId?: string;
  readonly docStatus?: string;
}) {
  "use no memo";
  const t = useTranslations("procurement.goodsReceiveNote");
  const tc = useTranslations("common");
  const tfl = useTranslations("field");

  const canView = grnStockVisible(docStatus);
  const { data, isLoading, isError, error, refetch } = useGrnStockMovements(
    grnId,
    { enabled: canView },
  );

  const rows = useMemo(() => data?.items ?? [], [data]);

  const columns = useMemo<ColumnDef<GrnStockMovementItem>[]>(() => {
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

    const cols: ColumnDef<GrnStockMovementItem>[] = [
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
      {
        accessorKey: "qty_in",
        header: tfl("in"),
        cell: ({ row }) => qtyCell(row.original.qty_in),
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
    // ดัน py-2 ตาม DESIGN.md เหมือนตารางสต๊อกของใบลดหนี้
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
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  if (!canView) {
    return <EmptyComponent icon={BoxIcon} title={t("stockNeedsCommitted")} />;
  }

  if (isError) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-3">
      {/* เทียบกับ false ตรง ๆ — ฟิลด์นี้อาจไม่มีใน response ซึ่งแปลว่า "ไม่รู้"
          ไม่ใช่ "ยังไม่ได้เข้าสต๊อก" บอกผิดคือบอกว่าเลขจริงเป็นเลขคาดการณ์ */}
      {data?.is_posted === false && (
        <p className="text-muted-foreground text-xs">{t("stockNotPosted")}</p>
      )}

      <DataGrid
        table={table}
        recordCount={rows.length}
        isLoading={isLoading}
        emptyMessage={
          <EmptyComponent icon={BoxIcon} title={tc("noDataFound")} />
        }
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
    </div>
  );
}
