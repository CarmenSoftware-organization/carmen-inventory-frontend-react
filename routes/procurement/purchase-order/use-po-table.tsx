import { useTranslations } from "use-intl";
import type { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { PO_TYPE, type PurchaseOrder } from "@/types/purchase-order";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";
import { useProfile } from "@/hooks/use-profile";
import { formatDate } from "@/lib/date-utils";
import { formatCurrency } from "@/lib/currency-utils";
import {
  auditColumns,
  columnSkeletons,
  sendbackColumn,
} from "@/components/ui/data-grid/columns";
import { StatusIconLabel } from "@/components/ui/status-icon-label";
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
  const tc = useTranslations("common");
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
      size: 140,
      meta: { headerTitle: tfl("poNo"), skeleton: columnSkeletons.text },
    },
    sendbackColumn<PurchaseOrder>(tc("sendBack")),
    {
      id: "vendor_name",
      accessorFn: (row) => row.vendor_name,
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("vendor")} />
      ),
      size: 200,
      meta: { headerTitle: tfl("vendor"), skeleton: columnSkeletons.text },
    },
    {
      id: "po_type",
      accessorFn: (row) => row.po_type,
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("poType")}
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const type = row.original.po_type ?? PO_TYPE.MANUAL;
        const config = PO_TYPE_CONFIG[type] ?? PO_TYPE_CONFIG[PO_TYPE.MANUAL];
        return (
          <StatusIconLabel
            status={type}
            label={config.label}
            // ชนิดใบไม่มีสี — สีสงวนไว้ให้สถานะซึ่งเป็นสิ่งที่คนกวาดตาหาจริง ๆ
            className="text-muted-foreground flex w-full justify-center"
          />
        );
      },
      size: 160,
      meta: {
        headerTitle: tfl("poType"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
        headerClassName: "text-center",
      },
    },
    {
      // คนที่เปิดใบสั่งซื้อใบนี้ — ใบเดียวกันคนละคนสั่งคนละเงื่อนไข ต้องรู้ว่าจะไป
      // ถามใครต่อ · หัวคอลัมน์ใช้คำว่า "ผู้จัดซื้อ" ตามที่หัวเอกสารเรียก ไม่ใช่
      // "ผู้สร้าง" กลาง ๆ · ไม่เรียงลำดับเพราะ audit เป็น object ซ้อน backend
      // เรียงให้ไม่ได้
      id: "created_by",
      accessorFn: (row) => row.audit?.created?.name ?? "",
      size: 180,
      header: tfl("buyer"),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.audit?.created?.name || "—"}
        </span>
      ),
      enableSorting: false,
      meta: {
        headerTitle: tfl("buyer"),
        skeleton: columnSkeletons.text,
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
      size: 100,
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
      size: 100,
      cell: ({ row }) => formatDate(row.getValue("delivery_date"), dateFormat),
      meta: {
        headerTitle: tfl("deliveryDate"),
        skeleton: columnSkeletons.text,
        cellClassName: "text-center",
      },
    },
    {
      accessorKey: "po_status",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("status")}
          className="justify-center"
        />
      ),
      size: 120,
      cell: ({ row }) => {
        const status = row.original.po_status;
        const config = PO_STATUS_CONFIG[status];
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
    ...auditColumns<PurchaseOrder>(tfl, dateTimeFormat),
  ];

  return useConfigTable<PurchaseOrder>({
    data: purchaseOrders,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
    hideStatus: true,
    initialState: {
      columnVisibility: { created_at: false, updated_at: false },
    },
    activity: { id: (r) => r.id, label: (r) => r.po_no },
  });
}
