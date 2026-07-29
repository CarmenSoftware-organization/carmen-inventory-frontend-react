import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { AuditCell } from "@/components/share/audit-cell";
import { Badge } from "@/components/ui/badge";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { GoodsReceiveNote } from "@/types/goods-receive-note";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import {
  GRN_STATUS_CONFIG,
  GRN_TYPE_CONFIG,
  GRN_DOC_TYPE_KEY,
} from "@/constant/goods-receive-note";
import { getGrnDocTypeLabel } from "@/constant/grn-doc-type";

interface UseGrnTableOptions {
  goodsReceiveNotes: GoodsReceiveNote[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (grn: GoodsReceiveNote) => void;
  onDelete: (grn: GoodsReceiveNote) => void;
}

export function useGrnTable({
  goodsReceiveNotes,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseGrnTableOptions) {
  const { dateFormat, dateTimeFormat } = useProfile();
  const tfl = useTranslations("field");

  const columns: ColumnDef<GoodsReceiveNote>[] = [
    {
      accessorKey: "grn_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("grnNo")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.grn_no}
        </CellAction>
      ),
      size: 200,
      meta: { headerTitle: tfl("grnNo") },
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("vendor")} />
      ),
      size: 200,
      meta: { headerTitle: tfl("vendor") },
    },
    {
      accessorKey: "grn_date",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("grnDate")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => formatDate(row.getValue("grn_date"), dateFormat),
      meta: {
        headerTitle: tfl("grnDate"),
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "invoice_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("invoiceNo")} />
      ),
      size: 150,
      meta: { headerTitle: tfl("invoiceNo") },
    },
    {
      accessorKey: "doc_status",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("status")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue<string>("doc_status") || "draft";
        const config = GRN_STATUS_CONFIG[status];
        return (
          <Badge size="sm" className={config?.className}>
            {config?.label ?? status.toUpperCase()}
          </Badge>
        );
      },
      size: 120,
      meta: {
        headerTitle: tfl("status"),
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "doc_type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("type")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const docType = row.original.doc_type;
        const configKey = GRN_DOC_TYPE_KEY[docType] ?? docType;
        const config = GRN_TYPE_CONFIG[configKey];
        const label = getGrnDocTypeLabel(tfl, docType);
        return (
          <Badge size="sm" className={config?.className}>
            {label}
          </Badge>
        );
      },
      size: 160,
      meta: {
        headerTitle: tfl("type"),
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("totalAmount")}
          className="justify-end"
        />
      ),
      cell: ({ row }) => {
        const amount = row.getValue<number>("total_amount");
        const currency = row.original.currency_code;
        if (amount == null) return <span></span>;
        return (
          <span className="font-medium tabular-nums">
            {formatCurrency(amount)}
            {currency && (
              <span className="text-muted-foreground ms-1 text-xs font-normal">
                {currency}
              </span>
            )}
          </span>
        );
      },
      meta: {
        headerTitle: tfl("totalAmount"),
        cellClassName: "text-right",
      },
      size: 200,
    },
    {
      // id = ชื่อคอลัมน์ backend เพื่อให้ sort ส่ง sort=created_at:asc|desc
      id: "created_at",
      accessorFn: (row) => row.audit?.created?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("created")} />
      ),
      cell: ({ row }) => (
        <AuditCell
          entry={row.original.audit?.created}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("created") },
    },
    {
      id: "updated_at",
      accessorFn: (row) => row.audit?.updated?.at ?? "",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("updated")} />
      ),
      cell: ({ row }) => (
        <AuditCell
          entry={row.original.audit?.updated}
          dateTimeFormat={dateTimeFormat}
        />
      ),
      size: 160,
      meta: { headerTitle: tfl("updated") },
    },
  ];

  return useConfigTable<GoodsReceiveNote>({
    data: goodsReceiveNotes,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    initialState: { columnVisibility: { created_at: false, updated_at: false } },
  });
}
