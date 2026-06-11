import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "use-intl";
import { DataGridColumnHeader } from "@/components/ui/data-grid/data-grid-column-header";
import { CellAction } from "@/components/ui/cell-action";
import { useConfigTable } from "@/components/ui/data-grid/use-config-table";
import { columnSkeletons } from "@/components/ui/data-grid/columns";
import type { EcoLabel } from "@/types/eco-label";
import type { ParamsDto } from "@/types/params";
import type { useDataGridState } from "@/hooks/use-data-grid-state";

interface UseEcoLabelTableOptions {
  data: EcoLabel[];
  totalRecords: number;
  params: ParamsDto;
  tableConfig: ReturnType<typeof useDataGridState>["tableConfig"];
  onEdit: (ecoLabel: EcoLabel) => void;
  onDelete: (ecoLabel: EcoLabel) => void;
}

export function useEcoLabelTable({
  data,
  totalRecords,
  params,
  tableConfig,
  onEdit,
  onDelete,
}: UseEcoLabelTableOptions) {
  const tfl = useTranslations("field");
  const t = useTranslations("config.eco");
  const columns: ColumnDef<EcoLabel>[] = [
    {
      accessorKey: "code",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={t("iso")} />
      ),
      cell: ({ row }) => (
        <CellAction onClick={() => onEdit(row.original)}>
          <span className="text-xs">{row.getValue("code")}</span>
        </CellAction>
      ),
      meta: { headerTitle: t("iso"), skeleton: columnSkeletons.text },
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} title={tfl("name")} />
      ),
      cell: ({ row }) => <span>{row.getValue("name")}</span>,
      meta: { headerTitle: tfl("name"), skeleton: columnSkeletons.text },
    },
  ];

  return useConfigTable<EcoLabel>({
    data,
    columns,
    totalRecords,
    params,
    tableConfig,
    onDelete,
  });
}
