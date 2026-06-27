import type { ColumnDef } from "@tanstack/react-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { Badge } from "@/components/ui/badge";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import { ADJUSTMENT_TYPE, type AdjustmentType } from "@/types/adjustment-type";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseAdjustmentTypeTableOptions {
  data: AdjustmentType[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (adjustmentType: AdjustmentType) => void;
  onDelete: (adjustmentType: AdjustmentType) => void;
}

export function useAdjustmentTypeTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseAdjustmentTypeTableOptions) {
  const columns: ColumnDef<AdjustmentType>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Code" />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          {row.getValue("code")}
        </CellAction>
      ),
      size: 120,
      meta: { headerTitle: "Code", skeleton: columnSkeletons.textShort },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title="Name" />
      ),
      meta: { headerTitle: "Name", skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "type",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title="Type"
          className="justify-center"
        />
      ),
      cell: ({ row }) => {
        const type = row.getValue<string>("type");
        return (
          <Badge
            size="lg"
            variant={type === ADJUSTMENT_TYPE.STOCK_IN ? "default" : "warning"}
          >
            {type === ADJUSTMENT_TYPE.STOCK_IN ? "Stock In" : "Stock Out"}
          </Badge>
        );
      },
      size: 120,
      meta: {
        headerTitle: "Type",
        cellClassName: "text-center",
        skeleton: columnSkeletons.badge,
      },
    },
  ];

  return useConfigTable<AdjustmentType>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
