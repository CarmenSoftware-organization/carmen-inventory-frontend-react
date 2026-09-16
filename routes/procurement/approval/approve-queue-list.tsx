import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { Clock } from "lucide-react";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
import { PR_STATUS_CONFIG } from "@/constant/purchase-request";
import type { ApprovalItem } from "@/types/approval";
import { formatDate } from "@/lib/date-utils";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router";
import {
  columnSkeletons,
  indexColumn,
  sendbackColumn,
} from "@/components/ui/data-grid/columns";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import {
  DataGrid,
  DataGridContainer,
  DataGridScrollArea,
} from "@/components/ui/data-grid/data-grid";
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import type { ParamsDto } from "@/types/params";
import EmptyComponent from "@/components/empty-component";

interface ApprovalQueueListProps {
  readonly items: ApprovalItem[];
  readonly totalRecords: number;
  readonly isLoading: boolean;
  readonly dateFormat: string;
  readonly params: ParamsDto;
  readonly tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
}

export default function ApprovalQueueList({
  items,
  totalRecords,
  isLoading,
  dateFormat,
  params,
  tableConfig,
}: ApprovalQueueListProps) {
  "use no memo";
  const t = useTranslations("procurement.approval");
  const tfl = useTranslations("field");
  const tc = useTranslations("common");

  const DOC_TYPE_CONFIG: Record<
    string,
    {
      label: string;
      variant: "info" | "warning" | "default";
      href: (id: string) => string;
    }
  > = {
    pr: {
      label: t("pr"),
      variant: "info",
      href: (id) => `/procurement/purchase-request/${id}`,
    },
    po: {
      label: t("po"),
      variant: "warning",
      href: (id) => `/procurement/purchase-order/${id}`,
    },
    sr: {
      label: t("sr"),
      variant: "default",
      href: (id) => `/store-operation/store-requisition/${id}`,
    },
  };

  const columns: ColumnDef<ApprovalItem>[] = [
    indexColumn<ApprovalItem>(params),
    {
      accessorKey: "doc_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("document")} />
      ),
      cell: ({ row }) => {
        const item = row.original;

        const href = DOC_TYPE_CONFIG[item.doc_type]?.href(item.id) ?? "#";
        return (
          <Link
            to={href}
            className="text-primary text-left text-xs font-semibold hover:underline"
          >
            {item.doc_no}
          </Link>
        );
      },
      meta: { headerTitle: t("document"), skeleton: columnSkeletons.text },
    },
    sendbackColumn<ApprovalItem>(tc("sendBack")),
    {
      accessorKey: "doc_type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("type")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => (
        <Badge
          variant={
            DOC_TYPE_CONFIG[row.original.doc_type]?.variant ?? "secondary"
          }
          size="xs"
        >
          {DOC_TYPE_CONFIG[row.original.doc_type]?.label ??
            row.original.doc_type.toUpperCase()}
        </Badge>
      ),
      size: 60,
      meta: {
        headerTitle: tfl("type"),
        cellClassName: "text-center",
        headerClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
    },

    {
      accessorKey: "doc_date",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("date")} />
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDate(row.original.doc_date, dateFormat)}
        </span>
      ),
      size: 100,
      meta: { headerTitle: tfl("date"), skeleton: columnSkeletons.text },
    },
    {
      // id ต้องเป็นชื่อคอลัมน์ของ view (doc_status) ไม่ใช่ชื่อที่ normalize แล้ว (status)
      // เพราะ id คือคีย์ที่ถูกส่งไปเป็น `sort=<id>:asc` และ backend ทิ้งคีย์นอก
      // allowlist เงียบ ๆ แล้วถอยไปเรียงตาม doc_date แทน — คลิกแล้วจะเหมือนไม่มีอะไรเกิดขึ้น
      id: "doc_status",
      accessorFn: (row) => row.status,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("status")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const status = row.original.status;
        const config =
          PR_STATUS_CONFIG[status ?? "draft"] ?? PR_STATUS_CONFIG.draft;
        return (
          <StatusIconLabel
            status={status ?? "draft"}
            label={config.label}
            // คอลัมน์นี้จัดกลาง — label เป็น inline-flex ซึ่ง `text-center`
            // ของเซลล์เอื้อมไม่ถึงเมื่ออยู่ในกล่อง clamp ของ DataGrid
            className="flex w-full justify-center"
          />
        );
      },
      size: 100,
      meta: {
        headerTitle: tfl("status"),
        cellClassName: "text-center",
        headerClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
    },
  ];

  const pageSize = tableConfig.state.pagination.pageSize;

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / pageSize),
  });

  return (
    <DataGrid
      table={table}
      recordCount={totalRecords}
      isLoading={isLoading}
      emptyMessage={
        <EmptyComponent
          icon={Clock}
          title={t("noPendingApprovals")}
          description={t("noPendingApprovalsDesc")}
        />
      }
      tableLayout={{ headerSticky: true }}
    >
      <DataGridContainer className="flex max-h-[calc(100vh-13rem-3rem)] flex-col">
        <DataGridScrollArea>
          <DataGridTable />
        </DataGridScrollArea>
        <DataGridPagination />
      </DataGridContainer>
    </DataGrid>
  );
}
