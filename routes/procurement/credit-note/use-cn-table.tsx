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
import {
  auditColumns,
  columnSkeletons,
} from "@/components/ui/data-grid/columns";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
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
  const { dateFormat, dateTimeFormat } = useProfile();

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
      size: 100,
      meta: { headerTitle: tfl("cnNo"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "vendor_name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("vendor")} />
      ),
      size: 200,
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
          <StatusIconLabel
            status={type}
            label={config?.label ?? type}
            // ชนิดใบไม่มีสี — สีสงวนไว้ให้สถานะซึ่งเป็นสิ่งที่คนกวาดตาหาจริง ๆ
            className="text-muted-foreground flex w-full justify-center"
          />
        );
      },
      meta: {
        headerTitle: tfl("type"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
    },
    {
      // คนที่เปิดใบลดหนี้ใบนี้ — ใบคืนของมักต้องคุยกลับกับคนเปิดว่าคืนเพราะอะไร
      // จึงต้องเห็นชื่อตั้งแต่หน้ารายการ · ไม่เรียงลำดับเพราะ audit เป็น object
      // ซ้อน backend เรียงให้ไม่ได้
      id: "created_by",
      accessorFn: (row) => row.audit?.created?.name ?? "",
      header: tfl("createdBy"),
      size: 170,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.audit?.created?.name || "—"}
        </span>
      ),
      enableSorting: false,
      meta: {
        headerTitle: tfl("createdBy"),
        skeleton: columnSkeletons.text,
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
      meta: {
        headerTitle: tfl("docDate"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
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
        const status = row.original.doc_status;
        const config = CN_STATUS_CONFIG[status];
        return (
          <StatusIconLabel
            status={status}
            label={config?.label ?? status}
            // คอลัมน์นี้จัดกลาง — label เป็น inline-flex ซึ่ง `text-center`
            // ของเซลล์เอื้อมไม่ถึงเมื่ออยู่ในกล่อง clamp ของ DataGrid
            className="flex w-full justify-center"
          />
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
    },
    ...auditColumns<CreditNote>(tfl, dateTimeFormat),
  ];

  return useConfigTable<CreditNote>({
    data: creditNotes,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    initialState: {
      columnVisibility: { created_at: false, updated_at: false },
    },
    activity: { id: (r) => r.id, label: (r) => r.cn_no },
  });
}
