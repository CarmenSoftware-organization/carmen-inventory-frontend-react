import type React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { MoreHorizontal, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import {
  selectColumn,
  indexColumn,
  columnSkeletons,
  customActionColumn,
} from "@/components/ui/data-grid/columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatAmount } from "@/lib/currency-utils";
import { PR_STATUS_CONFIG } from "@/constant/purchase-request";
import type { PurchaseRequest } from "@/types/purchase-request";
import { PR_STATUS } from "@/types/purchase-request";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UsePurchaseRequestTableOptions {
  items: PurchaseRequest[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (item: PurchaseRequest) => void;
  onDelete: (item: PurchaseRequest) => void;
  onApprove?: (item: PurchaseRequest) => void;
  onReject?: (item: PurchaseRequest) => void;
  isMyPending?: boolean;
}

export function usePurchaseRequestTable({
  items,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
  onApprove,
  onReject,
  isMyPending = true,
}: UsePurchaseRequestTableOptions) {
  "use no memo";
  const { dateFormat, amountFormat, defaultCurrencyCode } = useProfile();
  const tfl = useTranslations("field");
  const tc = useTranslations("common");

  const dataColumns: ColumnDef<PurchaseRequest>[] = [
    {
      accessorKey: "pr_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("prNo")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.original.pr_no}
        </CellAction>
      ),
      size: 140,
      meta: { headerTitle: tfl("prNo"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "pr_date",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("date")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => formatDate(row.original.pr_date, dateFormat),
      size: 120,
      meta: {
        headerTitle: tfl("date"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "workflow_name",
      header: tfl("type"),
      meta: {
        headerTitle: tfl("type"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
        headerClassName: "text-center",
      },
      size: 120,
    },
    {
      accessorKey: "workflow_current_stage",
      header: tfl("stage"),
      meta: {
        headerTitle: tfl("stage"),
        cellClassName: "text-center",
        headerClassName: "text-center",
        skeleton: columnSkeletons.text,
      },
      size: 140,
    },
    {
      accessorKey: "pr_status",
      header: tfl("status"),
      cell: ({ row }): React.ReactNode => {
        const status = row.original.pr_status;
        const config = PR_STATUS_CONFIG[status] ?? PR_STATUS_CONFIG.draft;
        return (
          <Badge className={config.className} size="sm">
            {config.label}
          </Badge>
        );
      },
      meta: {
        headerTitle: tfl("status"),
        cellClassName: "text-center",
        headerClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
      size: 140,
    },
    {
      accessorKey: "requestor_name",
      header: tfl("requester"),
      meta: { headerTitle: tfl("requester"), skeleton: columnSkeletons.text },
      size: 180,
    },
    {
      accessorKey: "department_name",
      header: tfl("department"),
      size: 220,
      meta: { headerTitle: tfl("department"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "base_total_amount",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("totalAmount")}
          className="justify-end"
        />
      ),
      cell: ({ row }) => {
        const amount = row.original.base_total_amount;
        if (amount == null) return <span></span>;
        return (
          <div className="text-right">
            <span className="font-medium">
              {formatAmount(amount, amountFormat)}
            </span>
            <span className="text-muted-foreground ms-1 text-xs font-normal">
              {defaultCurrencyCode}
            </span>
          </div>
        );
      },
      meta: {
        headerTitle: tfl("totalAmount"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-right",
        headerClassName: "text-right",
      },
      size: 150,
    },
  ];

  const prActionColumn = customActionColumn<PurchaseRequest>(({ row }) => {
    const item = row.original;
    const isDraft = item.pr_status === PR_STATUS.DRAFT;
    const isPendingApproval = item.pr_status === PR_STATUS.IN_PROGRESS;

    return (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label="Actions">
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onApprove && isPendingApproval && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onApprove(item)}
              >
                <CheckCircle2
                  className="text-success size-3"
                  aria-hidden="true"
                />
                {tc("approve")}
              </DropdownMenuItem>
            )}

            {onReject && isPendingApproval && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onReject(item)}
              >
                <XCircle
                  className="text-destructive size-3"
                  aria-hidden="true"
                />
                {tc("reject")}
              </DropdownMenuItem>
            )}

            {isDraft && (
              <>
                {(onApprove || onReject) && isPendingApproval && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  variant={"destructive"}
                >
                  <Trash2 className="text-destructive" aria-hidden="true" />
                  {tc("delete")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  });

  const allColumns: ColumnDef<PurchaseRequest>[] = [
    selectColumn<PurchaseRequest>(),
    indexColumn<PurchaseRequest>(params),
    ...dataColumns,
    ...(isMyPending ? [prActionColumn] : []),
  ];

  return useReactTable({
    data: items,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
