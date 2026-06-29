import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import {
  indexColumn,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatAmount } from "@/lib/currency-utils";
import type { Transaction, TransactionDocType } from "@/types/transaction";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseTransactionTableOptions {
  items: Transaction[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
}

const DOC_TYPE_CONFIG: Record<
  TransactionDocType,
  {
    label: string;
    variant:
      | "info"
      | "warning"
      | "destructive"
      | "secondary"
      | "default"
      | "success"
      | "invert";
  }
> = {
  stock_in: { label: "SI", variant: "info" },
  stock_out: { label: "SO", variant: "warning" },
  credit_note: { label: "CN", variant: "destructive" },
  purchase_request: { label: "PR", variant: "secondary" },
  purchase_order: { label: "PO", variant: "default" },
  good_received_note: { label: "GRN", variant: "success" },
  store_requisition: { label: "SR", variant: "invert" },
};

export function useTransactionTable({
  items,
  totalRecords,
  params,
  tableConfig,
}: UseTransactionTableOptions) {
  "use no memo";
  const { dateFormat, amountFormat } = useProfile();
  const tfl = useTranslations("field");
  const t = useTranslations("inventoryManagement.transaction");

  const dataColumns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "audit.created.at",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("date")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => formatDate(row.original.audit.created.at, dateFormat),
      meta: {
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "inventory_doc_type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("type")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const docType = row.original.inventory_doc_type;
        const config = DOC_TYPE_CONFIG[docType];
        return (
          <Badge variant={config?.variant ?? "outline"} size="sm">
            {config?.label ?? docType}
          </Badge>
        );
      },
      meta: {
        skeleton: columnSkeletons.badge,
        cellClassName: "text-center",
      },
      size: 80,
    },
    {
      accessorKey: "parent_document_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("parentDocNo")} />
      ),
      cell: ({ row }) => row.original.parent_document_no ?? "-",
      meta: { skeleton: columnSkeletons.text },
      size: 220,
    },
    {
      accessorKey: "product",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("product")} />
      ),
      cell: ({ row }) => {
        const products = [
          ...new Set(row.original.details.map((d) => d.product_name)),
        ];
        return products.join(", ");
      },
      meta: { skeleton: columnSkeletons.text },
      size: 220,
    },
    {
      accessorKey: "location",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("location")} />
      ),
      cell: ({ row }) => {
        const locations = [
          ...new Set(row.original.details.map((d) => d.location_name)),
        ];
        return locations.join(", ");
      },
      meta: { skeleton: columnSkeletons.text },
      size: 220,
    },
    {
      id: "qty_in",
      header: t("qtyIn"),
      cell: ({ row }) => {
        const total = row.original.details.reduce(
          (sum, d) => sum + d.qty_in,
          0,
        );
        if (total === 0) return "-";
        return <span className="text-success">{total}</span>;
      },
      meta: {
        skeleton: columnSkeletons.text,
        cellClassName: "text-right",
        headerClassName: "text-right",
      },
      size: 80,
    },
    {
      id: "qty_out",
      header: t("qtyOut"),
      cell: ({ row }) => {
        const total = row.original.details.reduce(
          (sum, d) => sum + d.qty_out,
          0,
        );
        if (total === 0) return "-";
        return <span className="text-destructive">{total}</span>;
      },
      meta: {
        skeleton: columnSkeletons.text,
        cellClassName: "text-right",
        headerClassName: "text-right",
      },
      size: 80,
    },
    {
      id: "items_count",
      header: tfl("items"),
      cell: ({ row }) => row.original.details.length,
      meta: {
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
        headerClassName: "text-center",
      },
      size: 60,
    },

    {
      id: "total_cost",
      header: tfl("total"),
      cell: ({ row }) => {
        const total = row.original.details.reduce(
          (sum, d) => sum + d.total_cost,
          0,
        );
        return formatAmount(total, amountFormat);
      },
      meta: {
        skeleton: columnSkeletons.text,
        cellClassName: "text-right",
        headerClassName: "text-right",
      },
    },
  ];

  const allColumns: ColumnDef<Transaction>[] = [
    indexColumn<Transaction>(params),
    ...dataColumns,
  ];

  return useReactTable({
    data: items,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
