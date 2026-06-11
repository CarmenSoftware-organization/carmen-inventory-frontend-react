import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { TaxProfile } from "@/types/tax-profile";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseTaxProfileTableOptions {
  data: TaxProfile[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (taxProfile: TaxProfile) => void;
  onDelete: (taxProfile: TaxProfile) => void;
}

/**
 * Hook สำหรับสร้าง TanStack Table สำหรับ Tax Profile พร้อมคอลัมน์ name และ tax rate
 * @param options - data, totalRecords, params, tableConfig, onEdit, onDelete
 * @returns TanStack table instance
 * @example
 * // route: /config/tax-profile
 * const { table } = useTaxProfileTable({ data, totalRecords, params, tableConfig, onEdit, onDelete });
 */
export function useTaxProfileTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseTaxProfileTableOptions) {
  const tfl = useTranslations("field");
  const columns: ColumnDef<TaxProfile>[] = [
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
    {
      accessorKey: "tax_rate",
      header: ({ column }) => (
        <DataGridColumnHeader
          column={column}
          title={tfl("rate")}
          className="justify-end"
        />
      ),
      cell: ({ row }) => (
        <span>{row.getValue<number>("tax_rate")}%</span>
      ),
      size: 100,
      meta: {
        headerTitle: tfl("rate"),
        cellClassName: "text-right",
        headerClassName: "text-right",
        skeleton: columnSkeletons.textShort,
      },
    },
  ];

  return useConfigTable<TaxProfile>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
