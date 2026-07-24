import { useTranslations } from "use-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { AuditCell } from "@/components/share/audit-cell";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { PO_TYPE, type PurchaseOrder } from "@/types/purchase-order";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import { Badge } from "@/components/ui/badge";
import { PO_STATUS_CONFIG, PO_TYPE_CONFIG } from "@/constant/purchase-order";

interface UsePoTableOptions {
  purchaseOrders: PurchaseOrder[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (po: PurchaseOrder) => void;
  onDelete: (po: PurchaseOrder) => void;
}

export function usePoTable({
  purchaseOrders,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UsePoTableOptions) {
  const tfl = useTranslations("field");
  const { dateFormat, dateTimeFormat } = useProfile();

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      accessorKey: "po_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("poNo")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("po_no")}
        </CellAction>
      ),
      size: 180,
      meta: { headerTitle: tfl("poNo"), skeleton: columnSkeletons.text },
    },
    {
      id: "vendor_name",
      accessorFn: (row) => row.vendor_name,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("vendor")} />
      ),
      size: 240,
      meta: { headerTitle: tfl("vendor"), skeleton: columnSkeletons.text },
    },
    {
      id: "po_type",
      accessorFn: (row) => row.po_type,
      header: tfl("poType"),
      cell: ({ row }) => {
        const type = row.original.po_type ?? PO_TYPE.MANUAL;
        const config = PO_TYPE_CONFIG[type] ?? PO_TYPE_CONFIG[PO_TYPE.MANUAL];
        return (
          <Badge size="sm" className={config.className}>
            {config.label}
          </Badge>
        );
      },
      meta: {
        headerTitle: tfl("poType"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
        headerClassName: "text-center",
      },
    },
    {
      accessorKey: "order_date",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("orderDate")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => formatDate(row.getValue("order_date"), dateFormat),
      meta: {
        headerTitle: tfl("orderDate"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "delivery_date",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("deliveryDate")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => formatDate(row.getValue("delivery_date"), dateFormat),
      meta: {
        headerTitle: tfl("deliveryDate"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "po_status",
      header: tfl("status"),
      enableSorting: false,
      cell: ({ row }) => {
        const status = row.original.po_status;
        const config = PO_STATUS_CONFIG[status];
        return (
          <Badge size="sm" className={config?.className}>
            {config?.label ?? status}
          </Badge>
        );
      },
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
        skeleton: columnSkeletons.text,
        cellClassName: "text-right",
      },
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
      meta: { headerTitle: tfl("created"), skeleton: columnSkeletons.text },
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
      meta: { headerTitle: tfl("updated"), skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<PurchaseOrder>({
    data: purchaseOrders,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    initialState: { columnVisibility: { created_at: false, updated_at: false } },
  });
}
