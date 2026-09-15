import { useMemo } from "react";
import { Link } from "react-router";
import { useTranslations } from "use-intl";
import {
  type ColumnDef,
  useReactTable,
  getCoreRowModel,
} from "@tanstack/react-table";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { useProfile } from "@/hooks/use-profile";
import { formatCurrency } from "@/lib/currency-utils";
import { formatDate } from "@/lib/date-utils";

/** ใบที่ backend สร้างให้ 1 ใบ (จาก `data.purchase_orders[]` ของ confirm-pr) */
export interface CreatedPo {
  readonly id: string;
  readonly po_no: string;
  readonly vendor_name: string | null;
  readonly delivery_date: string | null;
  readonly currency_code: string | null;
  readonly total_qty: number;
  readonly total_price: number;
  readonly total_tax: number;
  readonly total_amount: number;
  readonly items_count: number;
}

export interface ConfirmPrResult {
  readonly purchase_orders: CreatedPo[];
  readonly summary: {
    readonly total_pos_created: number;
    readonly total_prs_processed: number;
    readonly total_pr_details_processed: number;
  };
}

const PO_LIST_PATH = "/procurement/purchase-order";

const rightMeta = {
  headerClassName: "text-right",
  cellClassName: "text-right tabular-nums",
};

const buildColumns = (
  tfl: ReturnType<typeof useTranslations>,
  dateFormat: string,
): ColumnDef<CreatedPo>[] => [
  {
    id: "index",
    header: "#",
    size: 48,
    enableSorting: false,
    meta: {
      headerClassName: "text-center",
      cellClassName: "text-center text-muted-foreground tabular-nums",
    },
    cell: ({ row }) => row.index + 1,
  },
  {
    accessorKey: "po_no",
    header: tfl("poNo"),
    size: 150,
    cell: ({ row }) => (
      <Link
        to={`${PO_LIST_PATH}/${row.original.id}`}
        className="text-primary font-semibold hover:underline"
      >
        {row.original.po_no}
      </Link>
    ),
  },
  {
    accessorKey: "vendor_name",
    header: tfl("vendor"),
    size: 260,
    cell: ({ row }) => row.original.vendor_name || "—",
  },
  {
    accessorKey: "delivery_date",
    header: tfl("deliveryDate"),
    size: 130,
    meta: { cellClassName: "text-muted-foreground" },
    cell: ({ row }) =>
      row.original.delivery_date
        ? formatDate(row.original.delivery_date, dateFormat)
        : "—",
  },
  {
    accessorKey: "items_count",
    header: tfl("items"),
    size: 80,
    meta: rightMeta,
  },
  {
    accessorKey: "total_qty",
    header: tfl("qty"),
    size: 90,
    meta: rightMeta,
  },
  {
    accessorKey: "total_price",
    header: tfl("subtotal"),
    size: 110,
    meta: rightMeta,
    cell: ({ row }) => formatCurrency(row.original.total_price),
  },
  {
    accessorKey: "total_tax",
    header: tfl("tax"),
    size: 100,
    meta: rightMeta,
    cell: ({ row }) => formatCurrency(row.original.total_tax),
  },
  {
    accessorKey: "total_amount",
    header: tfl("total"),
    size: 130,
    meta: {
      headerClassName: "text-right",
      cellClassName: "text-right font-medium tabular-nums",
    },
    cell: ({ row }) => (
      <p>
        {formatCurrency(row.original.total_amount)}{" "}
        <span className="text-muted-foreground font-normal">
          {row.original.currency_code}
        </span>
      </p>
    ),
  },
];

export function StepResult({ result }: { readonly result: ConfirmPrResult }) {
  const t = useTranslations("procurement.purchaseOrder");
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();
  const { purchase_orders: orders, summary } = result;

  const columns = useMemo(
    () => buildColumns(tfl, dateFormat),
    [tfl, dateFormat],
  );

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex flex-col gap-4 p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex items-start gap-3">
        <div>
          <Button size="sm" variant="outline" asChild>
            <Link to={PO_LIST_PATH}>
              <ArrowLeft />
              {t("title")}
            </Link>
          </Button>
        </div>
        {/* สัญญาณสีเดียวคือไอคอน กล่องรอบ ๆ neutral ตาม docs/DESIGN.md */}
        <CheckCircle2 className="text-positive-ink mt-0.5 size-5 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-foreground text-sm font-semibold">
            {t("createdPoTitle", { count: summary.total_pos_created })}
          </h2>
          <p className="text-muted-foreground text-xs">
            {t("createdPoDesc", {
              prCount: summary.total_prs_processed,
              detailCount: summary.total_pr_details_processed,
            })}
          </p>
        </div>
      </div>

      <DataGrid
        table={table}
        recordCount={orders.length}
        tableLayout={{ headerBackground: true, rowBorder: true }}
        tableClassNames={{
          base: "text-xs",
          headerRow: "h-10",
          bodyRow: "h-11",
        }}
      >
        <DataGridContainer className="rounded-lg border">
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>
    </div>
  );
}
