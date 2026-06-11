import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { DeliveryPoint } from "@/types/delivery-point";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseDeliveryPointTableOptions {
  data: DeliveryPoint[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (deliveryPoint: DeliveryPoint) => void;
  onDelete: (deliveryPoint: DeliveryPoint) => void;
}

/**
 * Hook สำหรับสร้าง TanStack Table สำหรับ Delivery Point พร้อมคอลัมน์ name
 * @param options - data, totalRecords, params, tableConfig, onEdit, onDelete
 * @returns TanStack table instance
 * @example
 * // route: /config/delivery-point
 * const { table } = useDeliveryPointTable({ data, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useDeliveryPointTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseDeliveryPointTableOptions) {
  const tfl = useTranslations("field");
  const columns: ColumnDef<DeliveryPoint>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("name")}
        </CellAction>
      ),
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<DeliveryPoint>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
