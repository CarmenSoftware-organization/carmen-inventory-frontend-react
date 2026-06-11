import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { BusinessType } from "@/types/business-type";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseBusinessTypeTableOptions {
  data: BusinessType[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (businessType: BusinessType) => void;
  onDelete: (businessType: BusinessType) => void;
}

/**
 * Hook สำหรับสร้าง TanStack Table สำหรับ Business Type พร้อมคอลัมน์ name
 * @param options - data, totalRecords, params, tableConfig, onEdit, onDelete
 * @returns TanStack table instance
 * @example
 * // route: /config/business-type
 * const { table } = useBusinessTypeTable({ data, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useBusinessTypeTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseBusinessTypeTableOptions) {
  const tfl = useTranslations("field");
  const columns: ColumnDef<BusinessType>[] = [
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

  return useConfigTable<BusinessType>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
