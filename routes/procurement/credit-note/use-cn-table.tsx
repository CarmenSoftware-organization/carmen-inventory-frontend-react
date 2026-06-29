import { useTranslations } from "use-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import type { CreditNote } from "@/types/credit-note";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import { Badge } from "@/components/ui/badge";
import { CN_STATUS_CONFIG, CN_TYPE_CONFIG } from "@/constant/credit-note";

interface UseCnTableOptions {
  creditNotes: CreditNote[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (cn: CreditNote) => void;
  onDelete: (cn: CreditNote) => void;
}

export function useCnTable({
  creditNotes,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseCnTableOptions) {
  const tfl = useTranslations("field");
  const { dateFormat } = useProfile();

  const columns: ColumnDef<CreditNote>[] = [
    {
      accessorKey: "cn_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("cnNo")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.cn_no}
        </CellAction>
      ),
      size: 200,
      meta: { headerTitle: tfl("cnNo"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("vendor")} />
      ),
      size: 300,
      meta: { headerTitle: tfl("vendor"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "credit_note_type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("type")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const type = row.original.credit_note_type;
        const config = CN_TYPE_CONFIG[type];
        return (
          <Badge className={config?.className} size="sm">
            {config?.label ?? type}
          </Badge>
        );
      },
      size: 180,
      meta: {
        headerTitle: tfl("type"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "cn_date",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("docDate")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => formatDate(row.original.cn_date, dateFormat),
      size: 160,
      meta: {
        headerTitle: tfl("docDate"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "doc_status",
      header: tfl("status"),
      cell: ({ row }) => {
        const status = row.original.doc_status;
        const config = CN_STATUS_CONFIG[status];
        return (
          <Badge size="sm" className={config?.className}>
            {config?.label ?? status}
          </Badge>
        );
      },
      size: 160,
      meta: {
        headerTitle: tfl("status"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
        headerClassName: "text-center",
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
        const amount = row.original.total_amount;
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
        skeleton: columnSkeletons.text,
        cellClassName: "text-right",
      },
      size: 200,
    },
  ];

  return useConfigTable<CreditNote>({
    data: creditNotes,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
  });
}
