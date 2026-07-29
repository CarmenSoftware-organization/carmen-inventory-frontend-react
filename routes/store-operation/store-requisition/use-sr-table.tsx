import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { AuditCell } from "@/components/share/audit-cell";
import {
  selectColumn,
  indexColumn,
  actionColumn,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import { useTranslations } from "use-intl";
import { Badge } from "@/components/ui/badge";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type {
  StoreRequisition,
  StoreRequisitionStatus,
  StoreRequisitionType,
} from "@/types/store-requisition";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import {
  SR_STATUS_CONFIG,
  SR_TYPE_VARIANT,
} from "@/constant/store-requisition";

interface UseStoreRequisitionTableOptions {
  items: StoreRequisition[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (item: StoreRequisition) => void;
  onDelete: (item: StoreRequisition) => void;
}

export function useStoreRequisitionTable({
  items,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseStoreRequisitionTableOptions) {
  "use no memo";
  const { dateFormat, dateTimeFormat } = useProfile();
  const tfl = useTranslations("field");
  const ts = useTranslations("status");

  const dataColumns: ColumnDef<StoreRequisition>[] = [
    {
      accessorKey: "sr_no",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("srNo")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("sr_no")}
        </CellAction>
      ),
      meta: { headerTitle: tfl("srNo"), skeleton: columnSkeletons.text },
      size: 200,
    },
    {
      accessorKey: "sr_type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("type")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const type = row.getValue("sr_type") as StoreRequisitionType;
        if (!type) return null;
        return (
          <Badge
            variant={SR_TYPE_VARIANT[type]}
            size="xs"
            className="uppercase"
          >
            {type}
          </Badge>
        );
      },
      meta: {
        headerTitle: tfl("type"),
        skeleton: columnSkeletons.badge,
        cellClassName: "text-center",
      },
      size: 100,
    },
    {
      accessorKey: "sr_date",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("date")} />
      ),
      cell: ({ row }) => formatDate(row.getValue("sr_date"), dateFormat),
      meta: { headerTitle: tfl("date"), skeleton: columnSkeletons.text },
      size: 120,
    },
    {
      id: "location",
      accessorFn: (row) =>
        `${row.from_location_name} → ${row.to_location_name}`,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("fromTo")} />
      ),
      enableSorting: false,
      meta: { headerTitle: tfl("fromTo"), skeleton: columnSkeletons.text },
      size: 220,
    },
    {
      accessorKey: "requestor_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("requester")} />
      ),
      meta: { headerTitle: tfl("requester"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "department_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("department")} />
      ),
      meta: { headerTitle: tfl("department"), skeleton: columnSkeletons.text },
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
        const status = row.getValue("doc_status") as StoreRequisitionStatus;
        return (
          <Badge className={SR_STATUS_CONFIG[status]?.className} size="sm">
            {ts(status)}
          </Badge>
        );
      },
      meta: {
        headerTitle: tfl("status"),
        skeleton: columnSkeletons.badge,
        cellClassName: "text-center",
      },
      size: 80,
    },
    {
      accessorKey: "workflow_name",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("workflowStage")}
          className="justify-center"
        />
      ),
      meta: {
        headerTitle: tfl("workflowStage"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "workflow_current_stage",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("currentStage")}
          className="justify-center"
        />
      ),
      meta: {
        headerTitle: tfl("currentStage"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
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

  const allColumns: ColumnDef<StoreRequisition>[] = [
    selectColumn<StoreRequisition>(),
    indexColumn<StoreRequisition>(params),
    ...dataColumns,
    actionColumn<StoreRequisition>(onDelete),
  ];

  return useReactTable({
    data: items,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    initialState: { columnVisibility: { created_at: false, updated_at: false } },
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
