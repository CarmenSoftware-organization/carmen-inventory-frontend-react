import { useMemo } from "react";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { BoxIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import EmptyComponent from "@/components/empty-component";
import { formatCurrency } from "@/lib/currency-utils";
import { formatDate } from "@/lib/date-utils";
import { useProfile } from "@/hooks/use-profile";
import type {
  InventoryCostLayer,
  InventoryTransaction,
} from "@/hooks/use-product-inventory";

/**
 * `close_period` / `adjustment_in` / `stock_in` — backend ส่ง enum ดิบมา และเพิ่มค่าใหม่
 * ได้เรื่อย ๆ จึงไม่ทำตารางแปลไว้ ตัดขีดล่างออกให้อ่านง่ายพอ แล้วปล่อยตามที่ส่งมา
 */
function readableType(value: string): string {
  return value.replaceAll("_", " ");
}

const GRID_LAYOUT = { dense: true, headerBackground: true } as const;

function qtyText(value: number) {
  return (
    <span className="tabular-nums">{value ? value.toLocaleString() : "—"}</span>
  );
}

function moneyText(value: number) {
  return <span className="tabular-nums">{formatCurrency(value)}</span>;
}

export function InventoryLotTable({
  rows,
}: {
  readonly rows: readonly InventoryCostLayer[];
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const { dateFormat } = useProfile();

  const columns = useMemo<ColumnDef<InventoryCostLayer>[]>(
    () => [
      {
        id: "lot_no",
        header: tfl("lotNo"),
        size: 150,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate">{row.original.lot_no}</p>
            <p className="text-muted-foreground text-micro">
              {formatDate(row.original.lot_at_date, dateFormat)}
            </p>
          </div>
        ),
      },
      {
        id: "transaction_type",
        header: tfl("type"),
        size: 120,
        cell: ({ row }) => (
          <Badge size="xs" variant="secondary" className="whitespace-nowrap">
            {readableType(row.original.transaction_type)}
          </Badge>
        ),
      },
      {
        id: "in_qty",
        header: tfl("in"),
        size: 70,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => qtyText(row.original.in_qty),
      },
      {
        id: "out_qty",
        header: tfl("out"),
        size: 70,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => qtyText(row.original.out_qty),
      },
      {
        id: "balance_qty",
        header: tfl("balance"),
        size: 80,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        // ยอดคงเหลือติดลบคือล็อตที่ถูกตัดออกไปแล้ว ไม่ใช่ข้อมูลเพี้ยน — ย้อมสีไว้
        // ให้แยกออกจากแถวที่ยังมีของจริงตั้งแต่กวาดตา
        cell: ({ row }) => (
          <span
            className={
              row.original.balance_qty < 0
                ? "text-destructive tabular-nums"
                : "tabular-nums"
            }
          >
            {row.original.balance_qty.toLocaleString()}
          </span>
        ),
      },
      {
        id: "cost_per_unit",
        header: tfl("unitCost"),
        size: 100,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => moneyText(row.original.cost_per_unit),
      },
    ],
    [tfl, dateFormat],
  );

  const table = useReactTable({
    data: rows as InventoryCostLayer[],
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      tableLayout={GRID_LAYOUT}
      emptyMessage={<EmptyComponent icon={BoxIcon} title={tc("noDataFound")} />}
    >
      <DataGridContainer className="max-h-[52vh] overflow-auto">
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}

export function InventoryMovementTable({
  rows,
}: {
  readonly rows: readonly InventoryTransaction[];
}) {
  "use no memo";
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const { dateFormat } = useProfile();

  const columns = useMemo<ColumnDef<InventoryTransaction>[]>(
    () => [
      {
        id: "created_at",
        header: tfl("date"),
        size: 110,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDate(row.original.created_at, dateFormat)}
          </span>
        ),
      },
      {
        id: "doc_type",
        header: tfl("type"),
        size: 110,
        cell: ({ row }) => (
          <Badge size="xs" variant="secondary" className="whitespace-nowrap">
            {readableType(row.original.doc_type)}
          </Badge>
        ),
      },
      {
        id: "lot_no",
        header: tfl("lotNo"),
        size: 150,
        cell: ({ row }) => (
          <div className="min-w-0">
            <p className="truncate">{row.original.lot_no}</p>
            <p className="text-muted-foreground text-micro">
              {row.original.location_code}
            </p>
          </div>
        ),
      },
      {
        id: "qty",
        header: tfl("qty"),
        size: 80,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        // qty ติดลบ = ขาออก ไม่ได้แยกคอลัมน์เข้า/ออกเหมือนตารางล็อต เพราะ backend
        // ส่งมาเป็นคอลัมน์เดียวมีเครื่องหมาย
        cell: ({ row }) => (
          <span
            className={
              row.original.qty < 0
                ? "text-destructive tabular-nums"
                : "tabular-nums"
            }
          >
            {row.original.qty.toLocaleString()}
          </span>
        ),
      },
      {
        id: "cost_per_unit",
        header: tfl("unitCost"),
        size: 100,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => moneyText(row.original.cost_per_unit),
      },
      {
        id: "total_cost",
        header: tfl("totalCost"),
        size: 110,
        meta: { headerClassName: "text-right", cellClassName: "text-right" },
        cell: ({ row }) => moneyText(row.original.total_cost),
      },
    ],
    [tfl, dateFormat],
  );

  const table = useReactTable({
    data: rows as InventoryTransaction[],
    columns,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={rows.length}
      tableLayout={GRID_LAYOUT}
      emptyMessage={<EmptyComponent icon={BoxIcon} title={tc("noDataFound")} />}
    >
      <DataGridContainer className="max-h-[52vh] overflow-auto">
        <DataGridTable />
      </DataGridContainer>
    </DataGrid>
  );
}
