import type React from "react";
import type {
  ColumnDef,
  DisplayColumnDef,
  OnChangeFn,
  RowSelectionState,
} from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { useNavigate } from "react-router";
import {
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Copy,
  Trash2,
} from "lucide-react";
import { dispatchPermissionDenied } from "@/components/permission-denied-dialog";
import { useCreatableWorkflows } from "@/hooks/use-workflow";
import { WORKFLOW_TYPE } from "@/types/workflows";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import {
  auditColumns,
  columnSkeletons,
  customActionColumn,
  indexColumn,
  sendbackColumn,
} from "@/components/ui/data-grid/columns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { StatusIconLabel } from "@/components/ui/status-icon-label";
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
  /** ผู้ใช้กดติ๊กหนึ่งแถว — คนเรียกเป็นคนตัดสินว่าจะติ๊กให้จริงไหม */
  onRowSelect?: (item: PurchaseRequest, next: boolean) => void;
  /** ผู้ใช้กดติ๊กหัวตาราง */
  onSelectAll?: () => void;
  /** selection ถือโดยคนเรียก (key = pr id) เพราะกติกาการเลือกอยู่ที่นั่น */
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
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
  onRowSelect,
  onSelectAll,
  rowSelection,
  onRowSelectionChange,
}: UsePurchaseRequestTableOptions) {
  "use no memo";
  const { dateFormat, dateTimeFormat, amountFormat, defaultCurrencyCode } =
    useProfile();
  const tfl = useTranslations("field");
  const tc = useTranslations("common");
  const t = useTranslations("procurement.purchaseRequest");
  const navigate = useNavigate();
  // Duplicate = สร้างใบใหม่ — เกณฑ์เดียวกับปุ่ม Add: ต้องมี workflow ที่เริ่มได้
  // (PR ไม่มี permission .create ใน catalog) กดไม่ผ่านเด้ง dialog บอกเหตุผล
  const { canCreate: canCreatePr } = useCreatableWorkflows(WORKFLOW_TYPE.PR);
  const handleDuplicate = (item: PurchaseRequest) => {
    if (!canCreatePr) {
      dispatchPermissionDenied(undefined, t("noCreatableWorkflow"));
      return;
    }
    navigate(`/procurement/purchase-request/new?duplicate_id=${item.id}`);
  };

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
      size: 180,
      meta: { headerTitle: tfl("prNo"), skeleton: columnSkeletons.text },
    },
    sendbackColumn<PurchaseRequest>(tc("sendBack")),
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
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("type")}
          className="justify-center"
        />
      ),
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
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("stage")}
          className="justify-center"
        />
      ),
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
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("status")}
          className="justify-center"
        />
      ),
      cell: ({ row }): React.ReactNode => {
        const status = row.original.pr_status;
        const config = PR_STATUS_CONFIG[status] ?? PR_STATUS_CONFIG.draft;
        return (
          <StatusIconLabel
            status={status}
            label={config.label}
            // คอลัมน์นี้จัดกลาง — ตัว label เป็น inline-flex ซึ่ง `text-center`
            // ของเซลล์เอื้อมไม่ถึงเมื่ออยู่ในกล่อง clamp ของ DataGrid
            className="flex w-full justify-center"
          />
        );
      },
      meta: {
        headerTitle: tfl("status"),
        cellClassName: "text-center",
        headerClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
      size: 160,
    },
    {
      accessorKey: "requestor_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("requester")} />
      ),
      meta: { headerTitle: tfl("requester"), skeleton: columnSkeletons.text },
      size: 180,
    },
    {
      accessorKey: "department_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("department")} />
      ),
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
      size: 120,
    },
    ...auditColumns<PurchaseRequest>(tfl, dateTimeFormat),
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
                className="cursor-pointer font-semibold tracking-wide"
                onClick={() => onApprove(item)}
              >
                <CheckCircle2
                  className="text-success-ink size-3"
                  aria-hidden="true"
                />
                {tc("approve")}
              </DropdownMenuItem>
            )}

            {onReject && isPendingApproval && (
              <DropdownMenuItem
                className="cursor-pointer font-semibold tracking-wide"
                onClick={() => onReject(item)}
              >
                <XCircle
                  className="text-destructive size-3"
                  aria-hidden="true"
                />
                {tc("reject")}
              </DropdownMenuItem>
            )}

            {(onApprove || onReject) && isPendingApproval && (
              <DropdownMenuSeparator />
            )}

            {/* Duplicate ได้ทุกสถานะ — สั่งของประจำสัปดาห์คือก๊อปใบเดิมแล้วแก้จำนวน */}
            <DropdownMenuItem onClick={() => handleDuplicate(item)}>
              <Copy aria-hidden="true" />
              {tc("duplicate")}
            </DropdownMenuItem>

            {isDraft && (
              <DropdownMenuItem
                onClick={() => onDelete(item)}
                variant={"destructive"}
              >
                <Trash2 className="text-destructive" aria-hidden="true" />
                {tc("delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  });

  // ติ๊กเองไม่ได้ทันที — ส่งให้คนเรียกตัดสินก่อน เพราะใบฉบับร่างกับใบที่กำลัง
  // ดำเนินการทำงานคนละอย่าง จึงเลือกปนกันไม่ได้
  const prSelectColumn: DisplayColumnDef<PurchaseRequest> = {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    size: 60,
    meta: {
      headerClassName: "text-center print:hidden",
      cellClassName: "text-center print:hidden",
      skeleton: columnSkeletons.checkbox,
    },
    header: ({ table }) => {
      const isAllSelected = table.getIsAllPageRowsSelected();
      const isSomeSelected = table.getIsSomePageRowsSelected();
      return (
        <Checkbox
          checked={
            isSomeSelected && !isAllSelected ? "indeterminate" : isAllSelected
          }
          disabled={items.length === 0}
          onCheckedChange={() => onSelectAll?.()}
          aria-label={tc("aria.selectAll")}
          className="align-[inherit]"
        />
      );
    },
    cell: ({ row }) => (
      <>
        {row.getIsSelected() && (
          <div className="bg-primary absolute inset-s-0 top-0 bottom-0 w-0.5 rounded-full" />
        )}
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => onRowSelect?.(row.original, !!value)}
          aria-label={tc("aria.selectRow")}
          className="align-[inherit]"
        />
      </>
    ),
  };

  const allColumns: ColumnDef<PurchaseRequest>[] = [
    // all-document ไม่มี batch approve/reject ให้ทำ เลยไม่ต้องมีช่องติ๊ก
    ...(isMyPending ? [prSelectColumn] : []),
    indexColumn<PurchaseRequest>(params),
    ...dataColumns,
    ...(isMyPending ? [prActionColumn] : []),
  ];

  return useReactTable({
    data: items,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: isMyPending,
    // คอลัมน์ audit ซ่อนเป็น default (เปิดได้จากเมนู Toggle Columns)
    initialState: {
      columnVisibility: { created_at: false, updated_at: false },
    },
    ...tableConfig,
    // key ของ selection เป็น pr id ไม่ใช่เลข index แถว — ข้อมูลถูกลบ/เรียงใหม่แล้ว
    // ที่ติ๊กไว้ยังชี้ใบเดิม
    getRowId: (row) => row.id,
    state: { ...tableConfig.state, rowSelection },
    onRowSelectionChange,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
