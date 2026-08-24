import type { ColumnDef } from "@tanstack/react-table";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import {
  actionColumn,
  auditColumns,
  columnSkeletons,
  indexColumn,
  selectColumn,
  sendbackColumn,
} from "@/components/ui/data-grid/columns";
import { useTranslations } from "use-intl";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import type {
  StoreRequisition,
  StoreRequisitionStatus,
  StoreRequisitionType,
} from "@/types/store-requisition";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { StatusIconLabel } from "@/components/ui/status-icon-label";

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
  const tc = useTranslations("common");
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
      size: 120,
    },
    sendbackColumn<StoreRequisition>(tc("sendBack")),
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
          <StatusIconLabel
            status={type}
            label={type}
            // ชนิดใบไม่มีสี — สีสงวนไว้ให้สถานะซึ่งเป็นสิ่งที่คนกวาดตาหาจริง ๆ
            className="text-muted-foreground flex w-full justify-center uppercase"
          />
        );
      },
      meta: {
        headerTitle: tfl("type"),
        skeleton: columnSkeletons.badge,
        cellClassName: "text-center",
        headerClassName: "text-center",
      },
      size: 140,
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
      // id เป็นชื่อคอลัมน์จริงใน DB เพื่อให้ sort ฝั่ง server ได้ (เรียง From → To = เรียงต้นทาง)
      id: "from_location_name",
      accessorFn: (row) =>
        `${row.from_location_name} → ${row.to_location_name}`,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("fromTo")} />
      ),
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
          <StatusIconLabel
            status={status}
            label={ts(status)}
            // uppercase ด้วย CSS ไม่ใช่ .toUpperCase() — ค่าที่ export/คัดลอก
            // ยังเป็นข้อความเดิม และภาษาไทยที่ไม่มีตัวพิมพ์ใหญ่ก็ไม่โดนแตะ
            // (ต่างจากโมดูลอื่นที่ label uppercase มาจาก createStatusConfig แล้ว)
            //
            // คอลัมน์นี้จัดกลาง — label เป็น inline-flex ซึ่ง `text-center`
            // ของเซลล์เอื้อมไม่ถึงเมื่ออยู่ในกล่อง clamp ของ DataGrid
            className="flex w-full justify-center uppercase"
          />
        );
      },
      meta: {
        headerTitle: tfl("status"),
        skeleton: columnSkeletons.badge,
        cellClassName: "text-center",
        headerClassName: "text-center",
      },
      size: 140,
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
    ...auditColumns<StoreRequisition>(tfl, dateTimeFormat),
  ];

  const allColumns: ColumnDef<StoreRequisition>[] = [
    selectColumn<StoreRequisition>(),
    indexColumn<StoreRequisition>(params),
    ...dataColumns,
    actionColumn<StoreRequisition>(onDelete, {
      activity: { id: (r) => r.id, label: (r) => r.sr_no },
    }),
  ];

  return useReactTable({
    data: items,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    initialState: {
      columnVisibility: { created_at: false, updated_at: false },
    },
    ...tableConfig,
    pageCount: Math.ceil(totalRecords / (Number(params.perpage) || 10)),
  });
}
